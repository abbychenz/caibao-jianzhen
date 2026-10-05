"""
財報健診 - MOPS 公開資訊觀測站 財務報表擷取模組

透過分析 https://mops.twse.com.tw 的前端 JS 打包檔（/mops/assets/index.js）
找出實際的資料 API：

    POST https://mops.twse.com.tw/mops/api/<report_code>
    Content-Type: application/json
    Body: {
        "companyId": "2330",       # 股票代號
        "dataType": "2",           # "1"=最新一期, "2"=自訂年季
        "year": "113",             # 民國年
        "season": "4",             # 季別 1~4
        "subsidiaryCompanyId": ""  # 子公司代號，通常留空字串
    }

report_code 對照表：
    t164sb03  資產負債表 (Balance Sheet)
    t164sb04  綜合損益表 (Income Statement)
    t164sb05  現金流量表 (Cash Flow Statement)

回應格式：
    {
        "code": 200,
        "message": "查詢成功",
        "result": {
            "reportType": "合併",
            "year": "113",
            "reportList": [
                ["科目名稱", "本期金額", "本期%", "去年同期金額", "去年同期%"],
                ...
            ]
        }
    }
"""

from __future__ import annotations

import requests

BASE_URL = "https://mops.twse.com.tw/mops/api/"

REPORT_CODES = {
    "balance_sheet": "t164sb03",     # 資產負債表
    "income_statement": "t164sb04",  # 綜合損益表
    "cash_flow": "t164sb05",         # 現金流量表
}

HEADERS = {
    "Content-Type": "application/json",
    "Origin": "https://mops.twse.com.tw",
    "Referer": "https://mops.twse.com.tw/mops/web/t164sb03",
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
}


def fetch_report(company_id: str, year: str, season: str, report: str) -> dict:
    """
    向 MOPS 查詢指定公司、年度、季別的財報資料。

    company_id: 股票代號，例如 "2330"
    year:       民國年，例如 "113" (對應西元 2024)
    season:     季別 "1"~"4"
    report:     "balance_sheet" | "income_statement" | "cash_flow"
    """
    if report not in REPORT_CODES:
        raise ValueError(f"未知的報表類型: {report}，可用: {list(REPORT_CODES)}")

    code = REPORT_CODES[report]
    payload = {
        "companyId": company_id,
        "dataType": "2",
        "year": year,
        "season": season,
        "subsidiaryCompanyId": "",
    }

    resp = requests.post(BASE_URL + code, json=payload, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    if data.get("code") != 200:
        raise RuntimeError(f"MOPS 回應錯誤: {data}")

    return data["result"]


def fetch_company_info(company_id: str) -> dict:
    """
    查詢公司基本資料（t05st03），拿公司全名、產業別等。
    這支 API 跟財報三表不同，不需要 year/season，回應也不是 reportList，
    而是 {欄位: {"value": ..., "isHidden": ...}} 的形狀。
    """
    payload = {"companyId": company_id}
    resp = requests.post(BASE_URL + "t05st03", json=payload, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    if data.get("code") != 200:
        raise RuntimeError(f"MOPS 回應錯誤: {data}")

    result = data["result"]

    def field(key: str) -> str:
        entry = result.get(key) or {}
        return entry.get("value", "") or ""

    full_name = field("companyName")
    # MOPS 只回傳公司全名（例如「緯穎科技服務股份有限公司」），
    # 介面上想要的是像「緯穎科技服務」這種去掉公司組織型態後綴的短名。
    short_name = full_name
    for suffix in ("股份有限公司", "有限公司"):
        if short_name.endswith(suffix):
            short_name = short_name[: -len(suffix)]
            break

    return {
        "companyId": company_id,
        "name": short_name,
        "fullName": full_name,
        "industry": field("industryCategory"),
    }


def report_to_dict(result: dict) -> dict[str, str]:
    """
    把 reportList（二維陣列）轉成 {科目名稱: 本期金額} 的字典，方便查數字。
    忽略沒有金額的分類標題列（例如「流動資產」這種只當標題用的列）。
    """
    out: dict[str, str] = {}
    for row in result.get("reportList", []):
        name = row[0].strip("　 ")
        amount = row[1] if len(row) > 1 else ""
        if name and amount not in ("", None):
            out[name] = amount
    return out


if __name__ == "__main__":
    # 範例：抓台積電 (2330) 113 年第 4 季的三大報表
    company_id = "2330"
    year = "113"
    season = "4"

    print(f"=== {company_id} {year}年第{season}季 資產負債表 ===")
    bs = fetch_report(company_id, year, season, "balance_sheet")
    bs_dict = report_to_dict(bs)
    for key in ["資產總額", "負債總額", "流動資產合計", "流動負債合計"]:
        if key in bs_dict:
            print(f"{key}: {bs_dict[key]}")

    print(f"\n=== {company_id} {year}年第{season}季 綜合損益表 ===")
    is_ = fetch_report(company_id, year, season, "income_statement")
    is_dict = report_to_dict(is_)
    for key in ["營業收入合計", "營業利益（損失）", "稅前淨利（淨損）", "本期淨利（淨損）"]:
        if key in is_dict:
            print(f"{key}: {is_dict[key]}")
