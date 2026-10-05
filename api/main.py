"""
財報健診 - 後端 API (FastAPI)

把 mops_client.py / metrics.py / watchlist.py 的財務計算邏輯
包成前端可以呼叫的 JSON API。

啟動方式：
    cd ~/Projects/財報健診
    ./venv/bin/uvicorn api.main:app --reload --port 8000

啟動後可以打開 http://127.0.0.1:8000/docs 看自動產生的 API 文件。
"""

from __future__ import annotations

import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# 讓這支檔案可以 import 到上一層的 mops_client.py / metrics.py / watchlist.py
sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from metrics import (  # noqa: E402
    altman_z_score,
    cash_flow_analysis,
    dupont_trend,
    get_snapshot,
    piotroski_f_score,
    score_metrics,
    try_get_snapshot,
)
from mops_client import fetch_company_info  # noqa: E402
from watchlist import build_watchlist, score_watchlist  # noqa: E402
import portfolio  # noqa: E402
from twse_client import get_stock_history, get_stock_prices  # noqa: E402
from technical import analyze as analyze_technical  # noqa: E402
from news_client import fetch_news  # noqa: E402
from peer_comparison import compute_peer_comparison  # noqa: E402
import profile as profile_store  # noqa: E402
from advice import build_portfolio_advice  # noqa: E402
from pydantic import BaseModel  # noqa: E402

# Altman Z-Score / Piotroski F-Score 是設計給一般產業（製造/科技/零售等）用的模型，
# 銀行、保險、證券這類金融業的資產負債表結構天生不同（例如高槓桿是正常商業模式），
# 套用這兩個模型容易產生誤導性的「危險」判斷，所以在 API 層標記出來，前端要顯示警語。
FINANCIAL_INDUSTRY_KEYWORDS = ["金融", "銀行", "保險", "證券", "票券"]


def is_financial_industry(industry: str) -> bool:
    return any(k in (industry or "") for k in FINANCIAL_INDUSTRY_KEYWORDS)

app = FastAPI(title="財富管家 API")

portfolio.init_db()
profile_store.init_db()

# 開發階段先全開放，之後上線再改成只允許前端網域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 預設觀察名單（之後可以改成從資料庫或設定檔讀取）
DEFAULT_WATCHLIST = [
    {"id": "2330", "name": "台灣積體電路", "newsAlias": "台積電", "industry": "半導體業"},
    {"id": "2454", "name": "聯發科", "industry": "半導體業"},
    {"id": "2308", "name": "台達電", "industry": "電子零組件業"},
    {"id": "2603", "name": "長榮", "industry": "航運業"},
    {"id": "1101", "name": "台泥", "industry": "水泥業"},
]

def _current_default_period() -> tuple[str, str]:
    """
    根據今天的日期，推算 MOPS 上「目前應該已經公布」的最新一季財報（民國年）。

    財報公布截止日（概略）：
      - Q1（第一季）        5/15 前
      - Q2／半年報（第二季） 8/31 前
      - Q3（第三季）        11/14 前
      - Q4／年報（第四季）   次年 3/31 前

    抓「截止日已過」的最新一季，並多留 3 天緩衝（避免剛好卡在截止日當天、
    部分公司還沒申報完畢導致資料不齊）。
    """
    from datetime import date, timedelta

    today = date.today() - timedelta(days=3)
    roc_year = today.year - 1911

    if today.month < 3 or (today.month == 3 and today.day < 31):
        return str(roc_year - 1), "4"
    if today.month < 5 or (today.month == 5 and today.day < 15):
        return str(roc_year - 1), "4"
    if today.month < 8 or (today.month == 8 and today.day < 31):
        return str(roc_year), "1"
    if today.month < 11 or (today.month == 11 and today.day < 14):
        return str(roc_year), "2"
    return str(roc_year), "3"


DEFAULT_YEAR, DEFAULT_SEASON = _current_default_period()

# 公司名稱/產業別的簡易快取，避免每次都重打 MOPS 公司基本資料 API
_company_meta_cache: dict[str, dict] = {}


def get_company_meta(company_id: str) -> dict:
    """
    取得公司名稱與產業別。
    先查內建的觀察名單（免打 API，速度快），
    查不到再打 MOPS 的公司基本資料 API（t05st03），
    抓失敗的話回傳空字串，不讓整個請求掛掉。
    """
    hardcoded = next((item for item in DEFAULT_WATCHLIST if item["id"] == company_id), None)
    if hardcoded:
        return {"name": hardcoded["name"], "industry": hardcoded["industry"]}

    if company_id in _company_meta_cache:
        return _company_meta_cache[company_id]

    try:
        info = fetch_company_info(company_id)
        meta = {"name": info["name"], "industry": info["industry"]}
    except Exception:  # noqa: BLE001 - 查不到名稱不該讓財務數據也查不到
        meta = {"name": "", "industry": ""}

    _company_meta_cache[company_id] = meta
    return meta


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/default-period")
def get_default_period():
    """前端用這個 API 拿到目前應該使用的最新一季財報年/季，不用在前端寫死年份。"""
    return {"year": DEFAULT_YEAR, "season": DEFAULT_SEASON}


@app.get("/api/watchlist")
def get_watchlist(year: str = DEFAULT_YEAR, season: str = DEFAULT_SEASON):
    """回傳觀察名單的比較表（對應截圖『觀察名單』頁面）。"""
    ids = [item["id"] for item in DEFAULT_WATCHLIST]
    name_map = {item["id"]: item for item in DEFAULT_WATCHLIST}

    df = build_watchlist(ids, year=year, season=season)
    df = score_watchlist(df)

    records = df.to_dict(orient="records")
    for r in records:
        meta = name_map.get(r["股票代號"], {})
        r["name"] = meta.get("name", "")
        r["industry"] = meta.get("industry", "")

    return {"year": year, "season": season, "items": records}


def build_stock_payload(company_id: str, year: str, season: str) -> dict:
    """組出單一股票的基本財務快照，/api/stock/{id} 和 /api/compare 共用這段邏輯。"""
    snap = get_snapshot(company_id, year, season)
    meta = get_company_meta(company_id)

    roe_pct = round(snap.roe * 100, 2)
    debt_pct = round(snap.debt_ratio * 100, 2)
    cash_quality = round(snap.cash_flow_quality, 2)
    score = score_metrics(roe_pct, debt_pct, cash_quality)

    return {
        "companyId": snap.company_id,
        "name": meta["name"],
        "industry": meta["industry"],
        "year": snap.year,
        "season": snap.season,
        "score": score,
        "roe": roe_pct,
        "roeDirect": round(snap.roe_direct * 100, 2),
        "debtRatio": round(snap.debt_ratio * 100, 2),
        "cashFlowQuality": round(snap.cash_flow_quality, 2),
        "netMargin": round(snap.net_margin * 100, 2),
        "assetTurnover": round(snap.asset_turnover, 2),
        "equityMultiplier": round(snap.equity_multiplier, 2),
        "revenue": snap.revenue,
        "netIncome": snap.net_income,
        "totalAssets": snap.total_assets,
        "totalLiabilities": snap.total_liabilities,
        "totalEquity": snap.total_equity,
        "operatingCashFlow": snap.operating_cash_flow,
    }


def build_stock_analysis_payload(company_id: str, year: str, season: str) -> dict:
    """
    組出深度財務分析：Piotroski F-Score、Altman Z-Score、杜邦三年趨勢、現金流深度分析。
    /api/stock/{id}/analysis 和 /api/compare 共用這段邏輯。
    """
    current = get_snapshot(company_id, year, season)

    previous_year = str(int(year) - 1)
    previous = try_get_snapshot(company_id, previous_year, season)

    meta = get_company_meta(company_id)
    financial_industry = is_financial_industry(meta["industry"])

    f_score = piotroski_f_score(current, previous) if previous else None
    z_score = altman_z_score(current)
    trend = dupont_trend(company_id, year, season, years=3)
    cash_flow = cash_flow_analysis(current)

    return {
        "companyId": company_id,
        "year": year,
        "season": season,
        "financialIndustryWarning": financial_industry,
        "fScore": f_score,
        "fScoreUnavailableReason": None if previous else f"查無 {previous_year} 年第 {season} 季資料，無法比較年度變化",
        "zScore": z_score,
        "dupontTrend": trend,
        "cashFlow": cash_flow,
    }


def build_full_stock_payload(company_id: str, year: str, season: str) -> dict:
    """比較頁需要的『基本指標 + 深度分析』大集合，合併成一份給前端。"""
    basic = build_stock_payload(company_id, year, season)
    analysis = build_stock_analysis_payload(company_id, year, season)
    return {**basic, "analysis": analysis}


@app.get("/api/stock/{company_id}")
def get_stock(company_id: str, year: str = DEFAULT_YEAR, season: str = DEFAULT_SEASON):
    """回傳單一股票的詳細財務快照（對應截圖『儀表板』頁面）。"""
    try:
        return build_stock_payload(company_id, year, season)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"查詢 MOPS 失敗: {e}") from e


@app.get("/api/stock/{company_id}/technical")
def get_stock_technical(company_id: str, months: int = 13):
    """
    技術分析：K線資料、均線、RSI、MACD、KD、布林通道、支撐壓力位、技術分數。
    資料源：台灣證交所個股歷史日成交資料（僅涵蓋上市股票）。
    months 預設 13 個月，確保有足夠資料算 MA240（月線）。
    """
    try:
        history = get_stock_history(company_id, months=months)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"查詢證交所股價失敗: {e}") from e

    result = analyze_technical(history)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="查無足夠的歷史股價資料（可能是上櫃股票，或近期剛上市，資料不足 20 個交易日）",
        )
    return result


@app.get("/api/stock/{company_id}/news")
def get_stock_news(company_id: str, limit: int = 15):
    """
    個股相關新聞，資料來源：Google 新聞 RSS（免費，僅供個人非商業用途）。
    用公司名稱查詢（比用股票代號查準確很多），查不到名稱時退回用代號查詢。
    """
    meta = get_company_meta(company_id)
    hardcoded = next((item for item in DEFAULT_WATCHLIST if item["id"] == company_id), None)
    query = (hardcoded or {}).get("newsAlias") or meta["name"] or company_id
    items = fetch_news(query, limit=limit)
    return {"companyId": company_id, "query": query, "items": items}


@app.get("/api/stock/{company_id}/peer-comparison")
def get_stock_peer_comparison(company_id: str, year: str = DEFAULT_YEAR, season: str = DEFAULT_SEASON):
    """
    四維評分卡：把這支股票的估值/成長/財務健康/獲利能力拿去跟一組大型股基準池比百分位。
    第一次查詢會比較慢（要抓 40 幾檔基準股票的財報），之後 24 小時內都會用快取，很快。
    """
    try:
        return compute_peer_comparison(company_id, year, season)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"計算同業比較失敗: {e}") from e


@app.get("/api/stock/{company_id}/analysis")
def get_stock_analysis(company_id: str, year: str = DEFAULT_YEAR, season: str = DEFAULT_SEASON):
    """
    深度財務分析：Piotroski F-Score、Altman Z-Score、杜邦三年趨勢、現金流深度分析。
    參考「AI財務分析系統FMP規格說明書」的四階段分析方法論，改用 MOPS 資料實作。
    """
    try:
        return build_stock_analysis_payload(company_id, year, season)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"查詢 MOPS 失敗: {e}") from e


@app.get("/api/compare")
def compare_stocks(
    a: str,
    b: str,
    year: str = DEFAULT_YEAR,
    season: str = DEFAULT_SEASON,
):
    """
    財報比較：同時回傳兩支股票的完整資料（基本指標 + 深度分析）。
    兩邊查詢彼此獨立，用執行緒平行打 MOPS API，縮短等待時間
    （不然要抓兩家公司各 4 個年度的報表，序列跑會等很久）。
    """
    if a == b:
        raise HTTPException(status_code=400, detail="請選擇兩支不同的股票進行比較")

    with ThreadPoolExecutor(max_workers=2) as executor:
        future_a = executor.submit(build_full_stock_payload, a, year, season)
        future_b = executor.submit(build_full_stock_payload, b, year, season)

        try:
            result_a = future_a.result()
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=502, detail=f"查詢 {a} 失敗: {e}") from e

        try:
            result_b = future_b.result()
        except Exception as e:  # noqa: BLE001
            raise HTTPException(status_code=502, detail=f"查詢 {b} 失敗: {e}") from e

    return {"year": year, "season": season, "a": result_a, "b": result_b}


# ----------------------------------------------------------------------------
# 財富管家：個人投資組合（交易紀錄、持股、資產總覽）
# ----------------------------------------------------------------------------


class TransactionIn(BaseModel):
    companyId: str
    action: str  # "buy" | "sell"
    shares: float
    price: float
    tradeDate: str
    note: str = ""


@app.get("/api/portfolio/transactions")
def list_portfolio_transactions(company_id: str | None = None):
    """列出交易紀錄，可選擇只看某一檔股票。"""
    txs = portfolio.list_transactions(company_id)
    return {
        "items": [
            {
                "id": t["id"],
                "companyId": t["company_id"],
                "action": t["action"],
                "shares": t["shares"],
                "price": t["price"],
                "tradeDate": t["trade_date"],
                "note": t["note"],
            }
            for t in txs
        ]
    }


@app.post("/api/portfolio/transactions")
def create_portfolio_transaction(tx: TransactionIn):
    """新增一筆買進/賣出交易紀錄。賣超（賣出股數超過目前持股）會被拒絕。"""
    try:
        new_id = portfolio.add_transaction(
            company_id=tx.companyId,
            action=tx.action,
            shares=tx.shares,
            price=tx.price,
            trade_date=tx.tradeDate,
            note=tx.note,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"id": new_id}


@app.delete("/api/portfolio/transactions/{transaction_id}")
def remove_portfolio_transaction(transaction_id: int):
    portfolio.delete_transaction(transaction_id)
    return {"status": "ok"}


@app.get("/api/portfolio/summary")
def get_portfolio_summary(year: str = DEFAULT_YEAR, season: str = DEFAULT_SEASON):
    """
    投資總覽：把交易紀錄換算成「總成本、目前市值、未實現/已實現損益」，
    並附上每檔持股的財報健診分數（核心/衛星/觀察中建議），
    對應「總覽」首頁需要的所有資料。

    股價來源：台灣證交所 OpenAPI（僅涵蓋上市股票，上櫃股票查不到價格）。
    """
    holdings = portfolio.get_all_holdings()
    held_ids = [h["companyId"] for h in holdings if h["shares"] > 0]

    prices = get_stock_prices(held_ids) if held_ids else {}

    total_cost = 0.0
    total_market_value = 0.0
    total_realized_pnl = 0.0
    industry_totals: dict[str, float] = {}
    items = []

    def fetch_one(company_id: str) -> dict | None:
        try:
            return build_stock_payload(company_id, year, season)
        except Exception:  # noqa: BLE001 - 抓不到財報不該讓整個總覽掛掉，該檔只是缺分數
            return None

    with ThreadPoolExecutor(max_workers=4) as executor:
        stock_payloads = dict(zip(held_ids, executor.map(fetch_one, held_ids)))

    for h in holdings:
        cid = h["companyId"]
        total_realized_pnl += h["realizedPnl"]

        if h["shares"] <= 0:
            continue  # 已全部出清，不計入目前資產總覽，但已實現損益仍計入

        price_info = prices.get(cid)
        current_price = price_info["closingPrice"] if price_info else None
        market_value = current_price * h["shares"] if current_price is not None else None
        unrealized_pnl = (market_value - h["totalCost"]) if market_value is not None else None
        unrealized_pnl_pct = (
            round(unrealized_pnl / h["totalCost"] * 100, 2)
            if unrealized_pnl is not None and h["totalCost"]
            else None
        )

        stock = stock_payloads.get(cid)
        score = stock["score"] if stock else None
        name = stock["name"] if stock else (price_info["name"] if price_info else "")
        industry = stock["industry"] if stock else ""

        if score is not None:
            if score >= 75:
                recommendation = {"label": "核心", "color": "emerald"}
            elif score >= 55:
                recommendation = {"label": "衛星", "color": "amber"}
            else:
                recommendation = {"label": "觀察中", "color": "red"}
        else:
            recommendation = None

        total_cost += h["totalCost"]
        if market_value is not None:
            total_market_value += market_value
        if industry:
            industry_totals[industry] = industry_totals.get(industry, 0.0) + (market_value or h["totalCost"])

        items.append(
            {
                "companyId": cid,
                "name": name,
                "industry": industry,
                "shares": h["shares"],
                "avgCost": round(h["avgCost"], 2),
                "totalCost": round(h["totalCost"], 2),
                "currentPrice": current_price,
                "priceUnavailable": current_price is None,
                "marketValue": round(market_value, 2) if market_value is not None else None,
                "unrealizedPnl": round(unrealized_pnl, 2) if unrealized_pnl is not None else None,
                "unrealizedPnlPct": unrealized_pnl_pct,
                "score": score,
                "recommendation": recommendation,
            }
        )

    industry_allocation = [
        {"industry": k, "value": round(v, 2), "pct": round(v / total_market_value * 100, 1) if total_market_value else 0}
        for k, v in sorted(industry_totals.items(), key=lambda kv: -kv[1])
    ]

    unrealized_total = (total_market_value - total_cost) if total_market_value else None
    unrealized_total_pct = (
        round(unrealized_total / total_cost * 100, 2) if unrealized_total is not None and total_cost else None
    )

    return {
        "totalCost": round(total_cost, 2),
        "totalMarketValue": round(total_market_value, 2) if items else 0,
        "unrealizedPnl": round(unrealized_total, 2) if unrealized_total is not None else None,
        "unrealizedPnlPct": unrealized_total_pct,
        "realizedPnl": round(total_realized_pnl, 2),
        "holdings": items,
        "industryAllocation": industry_allocation,
    }


# ----------------------------------------------------------------------------
# 財富管家：個人偏好設定 + 規則式投資建議
# ----------------------------------------------------------------------------


class ProfileIn(BaseModel):
    preferredIndustries: list[str] = []
    preferredTickers: list[str] = []
    riskTolerance: str = "穩健"
    investmentGoal: str = "長期成長"
    investmentHorizon: str = "中期（1-3年）"
    typicalBudget: float | None = None
    notes: str = ""


@app.get("/api/profile")
def get_profile():
    return profile_store.get_profile()


@app.put("/api/profile")
def put_profile(profile: ProfileIn):
    return profile_store.save_profile(profile.model_dump())


@app.get("/api/advice")
def get_advice(year: str = DEFAULT_YEAR, season: str = DEFAULT_SEASON):
    """
    規則式投資建議：根據目前持股 + 個人偏好設定，
    針對每一檔持股給出「加碼／持有／等回檔／獲利了結／減碼」的建議，
    並列出偏好清單中尚未持有、體質不錯的候選標的。

    這不是 AI 生成的建議，是完全透明、可讀程式碼查證的規則邏輯，見 advice.py。
    """
    holdings = portfolio.get_all_holdings()
    profile = profile_store.get_profile()
    try:
        return build_portfolio_advice(holdings, profile, year, season)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"計算投資建議失敗: {e}") from e


# --- 把前端 build 好的靜態檔案一起 serve，這樣只需要部署這一個服務 ---
# （前端用 `cd frontend && npm run build` 產生 dist/，部署前要先 build 好並一起提交）
from fastapi.staticfiles import StaticFiles  # noqa: E402
from fastapi.responses import FileResponse  # noqa: E402

_FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if _FRONTEND_DIST.exists():
    _ASSETS_DIR = _FRONTEND_DIST / "assets"
    if _ASSETS_DIR.exists():
        app.mount("/assets", StaticFiles(directory=_ASSETS_DIR), name="frontend-assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        # /api/... 沒有被上面任何路由比對到，代表是不存在的 API 路徑
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = _FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        # 其餘路徑（含前端 client-side router 的路由）都回傳 index.html
        return FileResponse(_FRONTEND_DIST / "index.html")
