"""
財富管家 - 同業百分位比較模組（四維評分卡）

概念跟參考網站的「5軸雪花評分卡」類似：把一支股票的估值、成長、
財務健康、獲利能力，拿去跟一群大型股（benchmark.BENCHMARK_STOCKS）
比較，算出「贏過幾%基準股票」的百分位分數與 A~F 等第。

效能設計：
    要抓 40 幾檔股票各兩個年度的財報，序列做會很慢，
    這裡用 ThreadPoolExecutor 平行抓，並把結果快取 24 小時
    （同一季的財報本來就不會變，快取久一點沒關係）。
    第一次查詢會比較慢（要建立快取），之後同一季的查詢都很快。
"""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor

from benchmark import BENCHMARK_NOTE, BENCHMARK_STOCKS
from metrics import get_snapshot, try_get_snapshot
from twse_client import get_stock_prices

_CACHE_TTL_SECONDS = 24 * 3600
_cache: dict[str, dict] = {}


def _fetch_stock_metrics(company_id: str, year: str, season: str, prices: dict) -> dict | None:
    """抓單一股票算四維評分需要的原始數字，抓失敗回傳 None（該股票跳過，不影響其他股票）。"""
    try:
        current = get_snapshot(company_id, year, season)
    except Exception:  # noqa: BLE001
        return None

    previous = try_get_snapshot(company_id, str(int(year) - 1), season)
    price_info = prices.get(company_id)
    price = price_info["closingPrice"] if price_info else None
    pe = (price / current.eps) if (price is not None and current.eps and current.eps > 0) else None

    revenue_yoy = (
        (current.revenue - previous.revenue) / previous.revenue
        if previous and previous.revenue
        else None
    )
    eps_yoy = (
        (current.eps - previous.eps) / abs(previous.eps)
        if previous and previous.eps
        else None
    )

    return {
        "companyId": company_id,
        "pe": pe,
        "revenueYoy": revenue_yoy,
        "epsYoy": eps_yoy,
        "debtRatio": current.debt_ratio,
        "currentRatio": current.current_ratio if current.current_liabilities else None,
        "roe": current.roe,
        "netMargin": current.net_margin,
    }


def _compute_benchmark_metrics(year: str, season: str) -> list[dict]:
    """平行抓整個基準股票池的指標，回傳成功抓到的清單（失敗的股票直接跳過）。"""
    prices = get_stock_prices(BENCHMARK_STOCKS)

    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(
            executor.map(lambda cid: _fetch_stock_metrics(cid, year, season, prices), BENCHMARK_STOCKS)
        )

    return [r for r in results if r is not None]


def get_benchmark_metrics(year: str, season: str) -> list[dict]:
    """取得基準股票池的指標，24 小時內重複查詢會直接用快取。"""
    cache_key = f"{year}-{season}"
    now = time.time()
    cached = _cache.get(cache_key)
    if cached is not None and (now - cached["fetched_at"]) < _CACHE_TTL_SECONDS:
        return cached["metrics"]

    metrics = _compute_benchmark_metrics(year, season)
    _cache[cache_key] = {"metrics": metrics, "fetched_at": now}
    return metrics


def _percentile_rank(values: list[float], value: float, higher_is_better: bool) -> float:
    """
    算 value 在 values 這群數字裡的百分位（0~100，越高代表在這個指標上排名越前面）。
    higher_is_better=False 時（例如本益比、負債比，數字越小越好），會自動反轉方向。
    """
    if not values:
        return 50.0
    if higher_is_better:
        beaten = sum(1 for v in values if v <= value)
    else:
        beaten = sum(1 for v in values if v >= value)
    return round(beaten / len(values) * 100, 1)


def _grade(score: float) -> str:
    """把 0~100 的百分位分數轉成 A~F 等第（門檻是自訂的簡易版本，不是嚴謹的統計分級）。"""
    if score >= 75:
        return "A"
    if score >= 55:
        return "B"
    if score >= 35:
        return "C"
    if score >= 15:
        return "D"
    return "F"


def compute_peer_comparison(company_id: str, year: str, season: str) -> dict:
    """
    計算一支股票的「四維評分卡」：估值、成長、財務健康、獲利能力，
    每一軸都是「贏過基準股票池中百分之幾」的分數 + A~F 等第。
    """
    benchmark_metrics = get_benchmark_metrics(year, season)

    # 目標股票如果剛好也在基準池裡，直接複用；否則另外抓一次
    target = next((m for m in benchmark_metrics if m["companyId"] == company_id), None)
    if target is None:
        prices = get_stock_prices([company_id])
        target = _fetch_stock_metrics(company_id, year, season, prices)

    if target is None:
        return {
            "available": False,
            "reason": "查無足夠的財報資料計算同業比較",
            "benchmarkNote": BENCHMARK_NOTE,
            "benchmarkSize": len(benchmark_metrics),
        }

    def axis_score(key: str, higher_is_better: bool) -> tuple[float, float] | None:
        values = [m[key] for m in benchmark_metrics if m[key] is not None]
        if target[key] is None or not values:
            return None
        return _percentile_rank(values, target[key], higher_is_better), target[key]

    pe_result = axis_score("pe", higher_is_better=False)  # 本益比越低分數越高（越便宜）
    revenue_yoy_result = axis_score("revenueYoy", higher_is_better=True)
    eps_yoy_result = axis_score("epsYoy", higher_is_better=True)
    debt_result = axis_score("debtRatio", higher_is_better=False)
    current_ratio_result = axis_score("currentRatio", higher_is_better=True)
    roe_result = axis_score("roe", higher_is_better=True)
    margin_result = axis_score("netMargin", higher_is_better=True)

    def combine(*results):
        scores = [r[0] for r in results if r is not None]
        return round(sum(scores) / len(scores), 1) if scores else None

    valuation_score = pe_result[0] if pe_result else None
    growth_score = combine(revenue_yoy_result, eps_yoy_result)
    financial_health_score = combine(debt_result, current_ratio_result)
    profitability_score = combine(roe_result, margin_result)

    def axis_payload(score, details):
        if score is None:
            return {"available": False}
        return {
            "available": True,
            "score": score,
            "grade": _grade(score),
            "details": details,
        }

    return {
        "available": True,
        "benchmarkNote": BENCHMARK_NOTE,
        "benchmarkSize": len(benchmark_metrics),
        "axes": {
            "valuation": axis_payload(
                valuation_score,
                {"peX": round(target["pe"], 1) if target["pe"] is not None else None},
            ),
            "growth": axis_payload(
                growth_score,
                {
                    "revenueYoyPct": round(target["revenueYoy"] * 100, 1) if target["revenueYoy"] is not None else None,
                    "epsYoyPct": round(target["epsYoy"] * 100, 1) if target["epsYoy"] is not None else None,
                },
            ),
            "financialHealth": axis_payload(
                financial_health_score,
                {
                    "debtRatioPct": round(target["debtRatio"] * 100, 1),
                    "currentRatioX": round(target["currentRatio"], 2) if target["currentRatio"] is not None else None,
                },
            ),
            "profitability": axis_payload(
                profitability_score,
                {
                    "roePct": round(target["roe"] * 100, 1),
                    "netMarginPct": round(target["netMargin"] * 100, 1),
                },
            ),
        },
    }
