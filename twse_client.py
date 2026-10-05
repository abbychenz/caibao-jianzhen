"""
財富管家 - 台灣證交所股價擷取模組

用途：計算「目前市值」「未實現損益」需要知道股票現價，
MOPS（公開資訊觀測站）只有財報資料，沒有股價，所以另外
串接台灣證交所的 OpenAPI（完全免費、公開、不需要 API 金鑰）。

API 文件：https://openapi.twse.com.tw/
本模組只用其中一支端點：
    GET https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL
    → 回傳「所有上市股票」最近一個交易日的開高低收成交量。

注意：這支 API 目前只涵蓋「上市」股票（TWSE），不含「上櫃」股票（TPEx）。
上櫃股票（例如許多生技、電子零組件小型股）若要支援，需要另外串接
證券櫃買中心（TPEx）的公開資料，目前尚未實作，查不到時會回傳 None。
"""

from __future__ import annotations

import time
from datetime import date

import requests

STOCK_DAY_ALL_URL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
STOCK_DAY_URL = "https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY"

HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

# 全市場價格是一次性大量下載（約 1000+ 檔），用簡單的記憶體快取
# 避免同一分鐘內每個持股都各打一次 API。
_cache: dict = {"data": None, "fetched_at": 0.0}
_CACHE_TTL_SECONDS = 300  # 5 分鐘內共用同一份快取


def _fetch_all_prices() -> dict[str, dict]:
    """向 TWSE OpenAPI 抓全市場最新收盤價，回傳 {股票代號: {...}} 的字典。"""
    now = time.time()
    if _cache["data"] is not None and (now - _cache["fetched_at"]) < _CACHE_TTL_SECONDS:
        return _cache["data"]

    resp = requests.get(STOCK_DAY_ALL_URL, timeout=15)
    resp.raise_for_status()
    rows = resp.json()

    data = {}
    for row in rows:
        code = row.get("Code")
        if not code:
            continue
        try:
            closing_price = float(row.get("ClosingPrice", "0").replace(",", ""))
        except ValueError:
            closing_price = 0.0
        try:
            change = float(row.get("Change", "0").replace(",", ""))
        except ValueError:
            change = 0.0
        data[code] = {
            "code": code,
            "name": row.get("Name", ""),
            "date": row.get("Date", ""),
            "closingPrice": closing_price,
            "change": change,
        }

    _cache["data"] = data
    _cache["fetched_at"] = now
    return data


def get_stock_price(company_id: str) -> dict | None:
    """
    查單一股票的最新收盤價。
    查不到（例如上櫃股票、代號錯誤）回傳 None，呼叫端要自行處理缺價情況。
    """
    prices = _fetch_all_prices()
    return prices.get(company_id)


def get_stock_prices(company_ids: list[str]) -> dict[str, dict | None]:
    """批次查詢多檔股票現價，內部仍是共用同一份全市場快取，不會重複打 API。"""
    prices = _fetch_all_prices()
    return {cid: prices.get(cid) for cid in company_ids}


# ----------------------------------------------------------------------------
# 個股歷史日 K 資料（畫 K 線圖、算技術指標用）
# ----------------------------------------------------------------------------

# 以「股票代號-年-月」為 key 快取每個月的資料。
# 已經過去、不會再變動的月份快取時間拉長；當月資料每天都可能新增，快取時間縮短。
_history_cache: dict[str, dict] = {}
_HISTORY_CACHE_TTL_PAST_MONTH = 24 * 3600   # 過去月份：24 小時
_HISTORY_CACHE_TTL_CURRENT_MONTH = 3600     # 當月：1 小時


def _fetch_month(company_id: str, year: int, month: int) -> list[dict]:
    """抓某檔股票、某一個月的日成交資料。"""
    cache_key = f"{company_id}-{year}-{month:02d}"
    now = time.time()
    is_current_month = (year, month) == (date.today().year, date.today().month)
    ttl = _HISTORY_CACHE_TTL_CURRENT_MONTH if is_current_month else _HISTORY_CACHE_TTL_PAST_MONTH

    cached = _history_cache.get(cache_key)
    if cached is not None and (now - cached["fetched_at"]) < ttl:
        return cached["rows"]

    date_param = f"{year}{month:02d}01"
    resp = requests.get(
        STOCK_DAY_URL,
        params={"date": date_param, "stockNo": company_id, "response": "json"},
        headers=HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    rows = []
    if data.get("stat") == "OK":
        for row in data.get("data", []):
            # row: [日期(民國), 成交股數, 成交金額, 開盤價, 最高價, 最低價, 收盤價, 漲跌價差, 成交筆數, 註記]
            roc_date_str = row[0]  # 例如 "115/09/01"
            roc_year, roc_month, roc_day = roc_date_str.split("/")
            iso_date = f"{int(roc_year) + 1911}-{roc_month}-{roc_day}"

            def to_float(s: str) -> float:
                s = s.replace(",", "").strip()
                if s in ("", "--"):
                    return None
                try:
                    return float(s)
                except ValueError:
                    return None

            rows.append(
                {
                    "date": iso_date,
                    "open": to_float(row[3]),
                    "high": to_float(row[4]),
                    "low": to_float(row[5]),
                    "close": to_float(row[6]),
                    "volume": to_float(row[1]),
                }
            )

    _history_cache[cache_key] = {"rows": rows, "fetched_at": now}
    return rows


def get_stock_history(company_id: str, months: int = 8) -> list[dict]:
    """
    抓某檔股票最近 N 個月的日 K 資料（開高低收、成交量），由舊到新排序。
    抓不到資料（例如股票代號錯誤、剛上市不滿 N 個月）時，該月份就是空清單，不會拋例外。
    """
    today = date.today()
    rows: list[dict] = []

    # 由舊到新，逐月抓資料再串接起來
    months_to_fetch = []
    y, m = today.year, today.month
    for _ in range(months):
        months_to_fetch.append((y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    months_to_fetch.reverse()

    for year, month in months_to_fetch:
        rows.extend(_fetch_month(company_id, year, month))

    # 過濾掉收盤價缺漏的異常列（例如停牌日）
    rows = [r for r in rows if r["close"] is not None]
    rows.sort(key=lambda r: r["date"])
    return rows
