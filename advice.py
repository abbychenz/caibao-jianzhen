"""
財富管家 - 投資建議引擎（規則式，非 AI）

重要說明：這裡完全是「if/else 規則」組成的透明邏輯，
用的都是我們已經算好的數字（體質評分、F-Score、Z-Score、技術分數、
估值百分位），沒有呼叫任何 AI/LLM 服務，不會產生額外費用，
但也因此不是「真正理解市況的顧問」，只是把數據套進規則得出結論。
規則本身寫在下面，每一條判斷都可以直接讀程式碼查證，不是黑盒子。

免責：本模組產生的所有內容僅供參考，不構成專業投資建議，
使用者需自行承擔投資風險與決策責任。
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

from metrics import altman_z_score, get_snapshot, piotroski_f_score, score_metrics, try_get_snapshot
from peer_comparison import compute_peer_comparison
from technical import analyze as analyze_technical
from twse_client import get_stock_history, get_stock_prices
from mops_client import fetch_company_info

FINANCIAL_INDUSTRY_KEYWORDS = ["金融", "銀行", "保險", "證券", "票券"]


def _is_financial_industry(industry: str) -> bool:
    return any(k in (industry or "") for k in FINANCIAL_INDUSTRY_KEYWORDS)


RISK_MULTIPLIER = {"保守": 0.6, "穩健": 1.0, "積極": 1.3}

ACTION_STYLE = {
    "加碼": {"color": "emerald", "label": "可考慮加碼"},
    "獲利了結": {"color": "blue", "label": "可考慮部分獲利了結"},
    "等回檔": {"color": "amber", "label": "體質佳，等回檔再加碼"},
    "持有觀察": {"color": "gray", "label": "持有觀察"},
    "減碼": {"color": "red", "label": "建議減碼／觀察風險"},
}


def _evaluate_single_holding(
    company_id: str,
    name: str,
    industry: str,
    shares: float,
    avg_cost: float,
    total_cost: float,
    current_price: float | None,
    year: str,
    season: str,
    profile: dict,
    position_pct: float | None,
) -> dict:
    bullets: list[str] = []

    # --- 1. 基本面：本期財務快照 + 綜合評分 ---
    current = get_snapshot(company_id, year, season)
    roe_pct = round(current.roe * 100, 2)
    debt_pct = round(current.debt_ratio * 100, 2)
    cash_quality = round(current.cash_flow_quality, 2)
    fundamental_score = score_metrics(roe_pct, debt_pct, cash_quality)
    bullets.append(
        f"綜合體質評分 {fundamental_score}/100"
        f"（{'核心水準' if fundamental_score >= 75 else '衛星水準' if fundamental_score >= 55 else '偏弱，觀察中'}）"
    )

    # --- 2. Piotroski F-Score（今年 vs 去年）---
    previous = try_get_snapshot(company_id, str(int(year) - 1), season)
    f_score = None
    if previous:
        f_score_result = piotroski_f_score(current, previous)
        f_score = f_score_result["totalScore"]
        bullets.append(f"Piotroski F-Score {f_score}/9")

    # --- 3. Altman Z''-Score（財務危機預警）---
    z_result = altman_z_score(current)
    z_zone = z_result["zone"]
    financial_warning = _is_financial_industry(industry)
    zone_label = {"safe": "安全區", "grey": "灰色區", "distress": "危險區"}[z_zone]
    bullets.append(f"Altman Z''-Score 位於{zone_label}" + ("（金融業，此模型參考性較低）" if financial_warning else ""))

    # --- 4. 同業估值百分位 ---
    valuation_grade = None
    try:
        peer = compute_peer_comparison(company_id, year, season)
        if peer.get("available") and peer["axes"]["valuation"]["available"]:
            valuation_grade = peer["axes"]["valuation"]["grade"]
            v_score = peer["axes"]["valuation"]["score"]
            bullets.append(f"本益比同業百分位：贏過 {v_score}% 大型股（{valuation_grade} 等）")
    except Exception:  # noqa: BLE001 - 估值資料查不到就跳過，不影響其他判斷
        pass

    # --- 5. 技術面 ---
    tech_verdict = None
    tech_score = None
    rsi = None
    support = None
    resistance = None
    try:
        history = get_stock_history(company_id, months=8)
        tech = analyze_technical(history)
        if tech:
            tech_score = tech["technicalScore"]["score"]
            tech_verdict = tech["technicalScore"]["verdict"]
            rsi = tech["rsi"]
            if tech["supportResistance"]:
                support = tech["supportResistance"]["support"]
                resistance = tech["supportResistance"]["resistance"]
            bullets.append(f"技術面{tech_verdict}（技術分數 {tech_score}/100）")
    except Exception:  # noqa: BLE001 - 上櫃股票或查不到歷史價格時，技術面直接跳過
        pass

    # --- 6. 未實現損益 / 部位集中度 ---
    unrealized_pnl_pct = None
    if current_price is not None and total_cost:
        market_value = current_price * shares
        unrealized_pnl_pct = round((market_value - total_cost) / total_cost * 100, 1)
        bullets.append(f"未實現報酬率 {'+' if unrealized_pnl_pct >= 0 else ''}{unrealized_pnl_pct}%")

    concentration_warning = position_pct is not None and position_pct >= 40
    if position_pct is not None:
        bullets.append(
            f"目前佔投資組合市值 {position_pct}%" + ("（部位偏集中，加碼請留意風險）" if concentration_warning else "")
        )

    # ------------------------------------------------------------------
    # 決策規則（依序判斷，符合條件就採用，不再往下看）
    # ------------------------------------------------------------------
    strong_fundamental = fundamental_score >= 75
    weak_fundamental = fundamental_score < 55
    distress = z_zone == "distress"
    expensive = valuation_grade in ("D", "F")
    cheap_or_fair = valuation_grade in ("A", "B", "C") or valuation_grade is None
    bullish_tech = tech_verdict in ("強烈看多", "偏多")
    bearish_tech = tech_verdict in ("強烈看空", "偏空")
    overbought = rsi is not None and rsi >= 75

    if weak_fundamental and distress:
        action = "減碼"
    elif weak_fundamental:
        action = "持有觀察"
    elif strong_fundamental and overbought and expensive and (unrealized_pnl_pct or 0) >= 30:
        action = "獲利了結"
    elif strong_fundamental and expensive:
        action = "等回檔"
    elif strong_fundamental and cheap_or_fair and not bearish_tech:
        action = "加碼"
    elif strong_fundamental and bearish_tech:
        action = "等回檔"
    else:
        action = "持有觀察"

    style = ACTION_STYLE[action]

    # --- 價位建議 ---
    price_guidance = None
    if action in ("加碼", "等回檔") and support is not None and resistance is not None:
        price_guidance = (
            f"技術面近期支撐約 {support}、壓力約 {resistance}。"
            f"若拉回至支撐附近，可考慮分批進場；追高於壓力之上風險較高。"
        )
    elif action == "獲利了結" and resistance is not None:
        price_guidance = f"目前股價接近或已超過近期壓力位 {resistance}，若要獲利了結，可考慮分批出場而非一次全出。"
    elif action == "減碼":
        price_guidance = "建議不論價位，優先考慮降低部位或設定停損，而不是等特定價格。"

    # --- 金額建議 ---
    sizing_guidance = None
    if action in ("加碼",):
        budget = profile.get("typicalBudget")
        if budget:
            multiplier = RISK_MULTIPLIER.get(profile.get("riskTolerance", "穩健"), 1.0)
            if concentration_warning:
                multiplier *= 0.5
            suggested_amount = round(budget * multiplier)
            sizing_guidance = (
                f"依你設定的單筆習慣投入金額 NT${budget:,.0f}，"
                f"考量風險偏好（{profile.get('riskTolerance', '穩健')}）"
                + ("與目前部位偏集中" if concentration_warning else "")
                + f"，這筆可參考約 NT${suggested_amount:,.0f} 為上限，實際仍請依個人資金狀況調整。"
            )
        else:
            sizing_guidance = "尚未在「個人資訊」設定單筆習慣投入金額，設定後可以給你更具體的金額建議。"

    return {
        "companyId": company_id,
        "name": name,
        "industry": industry,
        "action": action,
        "actionLabel": style["label"],
        "actionColor": style["color"],
        "fundamentalScore": fundamental_score,
        "fScore": f_score,
        "zScoreZone": z_zone,
        "financialIndustryWarning": financial_warning,
        "valuationGrade": valuation_grade,
        "technicalScore": tech_score,
        "technicalVerdict": tech_verdict,
        "unrealizedPnlPct": unrealized_pnl_pct,
        "positionPct": position_pct,
        "reasonBullets": bullets,
        "priceGuidance": price_guidance,
        "sizingGuidance": sizing_guidance,
    }


def build_portfolio_advice(holdings: list[dict], profile: dict, year: str, season: str) -> dict:
    """
    holdings: portfolio.get_all_holdings() 出來、且 shares > 0 的清單
              （每筆要含 companyId/shares/avgCost/totalCost）
    """
    active_holdings = [h for h in holdings if h["shares"] > 0]
    company_ids = [h["companyId"] for h in active_holdings]
    prices = get_stock_prices(company_ids) if company_ids else {}

    total_market_value = 0.0
    market_values = {}
    for h in active_holdings:
        price_info = prices.get(h["companyId"])
        price = price_info["closingPrice"] if price_info else None
        mv = price * h["shares"] if price is not None else h["totalCost"]
        market_values[h["companyId"]] = mv
        total_market_value += mv

    def evaluate(h):
        try:
            info = fetch_company_info(h["companyId"])
            name, industry = info["name"], info["industry"]
        except Exception:  # noqa: BLE001
            name, industry = h["companyId"], ""

        price_info = prices.get(h["companyId"])
        current_price = price_info["closingPrice"] if price_info else None
        position_pct = (
            round(market_values[h["companyId"]] / total_market_value * 100, 1) if total_market_value else None
        )

        try:
            return _evaluate_single_holding(
                h["companyId"],
                name,
                industry,
                h["shares"],
                h["avgCost"],
                h["totalCost"],
                current_price,
                year,
                season,
                profile,
                position_pct,
            )
        except Exception as e:  # noqa: BLE001 - 單一股票算失敗不該讓整份建議掛掉
            return {
                "companyId": h["companyId"],
                "name": name,
                "industry": industry,
                "action": None,
                "error": str(e),
            }

    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(evaluate, active_holdings))

    # --- 關注但尚未持有的標的（來自個人資訊頁設定的偏好股票代號）---
    candidates = []
    held_ids = set(company_ids)
    for ticker in profile.get("preferredTickers", []):
        if ticker in held_ids:
            continue
        try:
            snap = get_snapshot(ticker, year, season)
            roe_pct = round(snap.roe * 100, 2)
            debt_pct = round(snap.debt_ratio * 100, 2)
            cash_quality = round(snap.cash_flow_quality, 2)
            score = score_metrics(roe_pct, debt_pct, cash_quality)
            info = fetch_company_info(ticker)
            candidates.append(
                {
                    "companyId": ticker,
                    "name": info["name"],
                    "industry": info["industry"],
                    "fundamentalScore": score,
                    "note": (
                        f"體質評分 {score}/100，屬於你關注清單中尚未持有的標的，"
                        + ("體質不錯可以研究看看" if score >= 65 else "目前體質分數普通，建議再觀察")
                    ),
                }
            )
        except Exception:  # noqa: BLE001 - 查不到就跳過這支候選股票
            continue

    return {
        "generatedFor": {"year": year, "season": season},
        "holdings": results,
        "candidates": candidates,
    }
