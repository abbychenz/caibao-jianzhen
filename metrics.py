"""
財報健診 - 財務指標計算模組

用 mops_client.py 抓到的資產負債表 / 損益表數字，
計算截圖介面中看到的核心指標：
    - ROE（股東權益報酬率）
    - 負債比
    - ROE 杜邦三因子分解（淨利率 × 總資產週轉率 × 權益乘數）
    - 現金流品質（營業活動現金流 / 本期淨利，越接近或超過 1 代表獲利含金量高）

注意：這裡採用「期末值」計算（用當季期末的資產/權益），
      不是學術上更嚴謹的「期初期末平均值」，
      先求出一版能動的邏輯，之後有需要再改成平均值版本。
"""

from __future__ import annotations

from dataclasses import dataclass

from mops_client import fetch_report, report_to_dict


def to_number(value: str) -> float:
    """把 MOPS 回傳的字串數字（有千分位逗號、可能是負數）轉成 float。"""
    if value is None:
        return 0.0
    v = value.strip().replace(",", "")
    if v in ("", "-"):
        return 0.0
    negative = v.startswith("(") and v.endswith(")")
    v = v.strip("()")
    try:
        num = float(v)
    except ValueError:
        return 0.0
    return -num if negative else num


@dataclass
class FinancialSnapshot:
    company_id: str
    year: str
    season: str

    revenue: float           # 營業收入合計
    net_income: float        # 本期淨利（淨損）
    total_assets: float      # 資產總額
    total_liabilities: float # 負債總額
    total_equity: float      # 權益總額
    operating_cash_flow: float  # 營業活動之淨現金流入（流出）

    # --- 以下為 Piotroski F-Score / Altman Z-Score / 現金流深度分析新增欄位 ---
    current_assets: float = 0.0       # 流動資產合計
    current_liabilities: float = 0.0  # 流動負債合計
    retained_earnings: float = 0.0    # 保留盈餘合計
    long_term_debt: float = 0.0       # 長期借款（查無則用非流動負債合計替代）
    gross_profit: float = 0.0         # 營業毛利（毛損）
    operating_income: float = 0.0     # 營業利益（損失）
    interest_expense: float = 0.0     # 財務成本淨額（利息費用）
    shares_proxy: float = 0.0         # 股本合計，當作股數變化的替代指標（面額多為 10 元）
    investing_cash_flow: float = 0.0  # 投資活動之淨現金流入（流出）
    financing_cash_flow: float = 0.0  # 籌資活動之淨現金流入（流出）
    capex: float = 0.0                # 取得不動產、廠房及設備（資本支出，正值）
    eps: float = 0.0                  # 基本每股盈餘（算本益比用）

    @property
    def net_margin(self) -> float:
        """淨利率 = 本期淨利 / 營業收入"""
        return self.net_income / self.revenue if self.revenue else 0.0

    @property
    def asset_turnover(self) -> float:
        """總資產週轉率 = 營業收入 / 資產總額"""
        return self.revenue / self.total_assets if self.total_assets else 0.0

    @property
    def equity_multiplier(self) -> float:
        """權益乘數 = 資產總額 / 權益總額"""
        return self.total_assets / self.total_equity if self.total_equity else 0.0

    @property
    def roe(self) -> float:
        """ROE = 淨利率 × 總資產週轉率 × 權益乘數（杜邦分解）"""
        return self.net_margin * self.asset_turnover * self.equity_multiplier

    @property
    def roe_direct(self) -> float:
        """ROE 直接算法 = 本期淨利 / 權益總額（驗證用，應與 roe 一致）"""
        return self.net_income / self.total_equity if self.total_equity else 0.0

    @property
    def debt_ratio(self) -> float:
        """負債比 = 負債總額 / 資產總額"""
        return self.total_liabilities / self.total_assets if self.total_assets else 0.0

    @property
    def cash_flow_quality(self) -> float:
        """
        現金流品質 = 營業活動之淨現金流入 / 本期淨利
        對應截圖中的「現金流品質 1.15x」。
        > 1：淨利大部分真的變成現金，獲利含金量高、品質好
        < 1：淨利有相當比例只是帳上數字（例如應收帳款增加），要留意
        淨利為負或 0 時無意義，回傳 0。
        """
        if not self.net_income:
            return 0.0
        return self.operating_cash_flow / self.net_income

    @property
    def roa(self) -> float:
        """ROA = 本期淨利 / 資產總額"""
        return self.net_income / self.total_assets if self.total_assets else 0.0

    @property
    def current_ratio(self) -> float:
        """流動比率 = 流動資產 / 流動負債，衡量短期償債能力"""
        return self.current_assets / self.current_liabilities if self.current_liabilities else 0.0

    @property
    def gross_margin(self) -> float:
        """毛利率 = 營業毛利 / 營業收入"""
        return self.gross_profit / self.revenue if self.revenue else 0.0

    @property
    def long_term_debt_ratio(self) -> float:
        """長期負債比率 = 長期負債 / 資產總額"""
        return self.long_term_debt / self.total_assets if self.total_assets else 0.0

    @property
    def ebit(self) -> float:
        """EBIT = 營業利益 + 利息費用（依規格書公式，保留原始符號、不取絕對值）"""
        return self.operating_income + self.interest_expense

    @property
    def free_cash_flow(self) -> float:
        """自由現金流 = 營業活動現金流 - 資本支出（資本支出取絕對值後再減）"""
        return self.operating_cash_flow - abs(self.capex)

    def summary(self) -> str:
        return (
            f"{self.company_id}  {self.year}年第{self.season}季\n"
            f"  ROE           : {self.roe * 100:6.2f}%   "
            f"(驗證: {self.roe_direct * 100:.2f}%)\n"
            f"  負債比         : {self.debt_ratio * 100:6.2f}%\n"
            f"  現金流品質     : {self.cash_flow_quality:6.2f}x   "
            f"(營業現金流 {self.operating_cash_flow:,.0f} / 淨利 {self.net_income:,.0f})\n"
            f"  --- 杜邦分解 ---\n"
            f"  淨利率         : {self.net_margin * 100:6.2f}%\n"
            f"  總資產週轉率    : {self.asset_turnover:6.2f} 次\n"
            f"  權益乘數       : {self.equity_multiplier:6.2f} 倍\n"
        )


def first_match(d: dict, keys: list[str]) -> str | None:
    """
    依序嘗試多個可能的科目名稱，回傳第一個有找到的值。

    銀行、保險等金融業的財報科目名稱跟一般產業不一樣
    （例如「資產總計」vs 一般產業的「資產總額」），
    用這個小工具讓同一段程式碼可以兼容兩種命名。
    """
    for k in keys:
        if k in d:
            return d[k]
    return None


def score_metrics(roe_pct: float, debt_ratio_pct: float, cash_flow_quality: float) -> int:
    """
    示範用的綜合評分公式（0~100），供 watchlist.py 與 API 共用：
        ROE       佔 40 分（以 20% ROE 為滿分基準）
        負債比    佔 30 分（負債比越低分數越高，60% 以上得 0 分）
        現金流品質 佔 30 分（1.0x 以上得滿分）

    這不是嚴謹的財務評等模型，只是一個之後可以再調整權重的起始版本。
    """
    # 每個子項都限制在 [0, 滿分] 之間，避免負的 ROE 或負的現金流品質
    # 讓子項貢獻變成負分，導致總分跌出 0~100 的範圍。
    roe_score = max(0.0, min(roe_pct / 20, 1.0)) * 40
    debt_score = max(0.0, min(1 - debt_ratio_pct / 60, 1.0)) * 30
    cash_score = max(0.0, min(cash_flow_quality / 1.0, 1.0)) * 30
    return round(max(0.0, min(roe_score + debt_score + cash_score, 100.0)))


def get_snapshot(company_id: str, year: str, season: str) -> FinancialSnapshot:
    """抓資產負債表 + 損益表 + 現金流量表，組成一份財務快照。"""
    bs = report_to_dict(fetch_report(company_id, year, season, "balance_sheet"))
    is_ = report_to_dict(fetch_report(company_id, year, season, "income_statement"))
    cf = report_to_dict(fetch_report(company_id, year, season, "cash_flow"))

    # 一般產業 vs 金融業（銀行/保險/證券）的科目名稱不一樣，兩邊都嘗試
    revenue = first_match(is_, ["營業收入合計", "淨收益"])
    net_income = first_match(is_, ["本期淨利（淨損）", "本期稅後淨利（淨損）"])
    total_assets = first_match(bs, ["資產總額", "資產總計"])
    total_liabilities = first_match(bs, ["負債總額", "負債總計"])
    total_equity = first_match(bs, ["權益總額", "權益總計"])

    long_term_debt = first_match(bs, ["長期借款", "非流動負債合計"])
    capex_raw = first_match(cf, ["取得不動產、廠房及設備"])

    return FinancialSnapshot(
        company_id=company_id,
        year=year,
        season=season,
        revenue=to_number(revenue),
        net_income=to_number(net_income),
        total_assets=to_number(total_assets),
        total_liabilities=to_number(total_liabilities),
        total_equity=to_number(total_equity),
        operating_cash_flow=to_number(cf.get("營業活動之淨現金流入（流出）")),
        current_assets=to_number(bs.get("流動資產合計")),
        current_liabilities=to_number(bs.get("流動負債合計")),
        retained_earnings=to_number(bs.get("保留盈餘合計")),
        long_term_debt=to_number(long_term_debt),
        gross_profit=to_number(first_match(is_, ["營業毛利（毛損）淨額", "營業毛利（毛損）"])),
        operating_income=to_number(is_.get("營業利益（損失）")),
        interest_expense=to_number(first_match(is_, ["財務成本淨額", "利息費用"])),
        shares_proxy=to_number(bs.get("股本合計")),
        investing_cash_flow=to_number(cf.get("投資活動之淨現金流入（流出）")),
        financing_cash_flow=to_number(cf.get("籌資活動之淨現金流入（流出）")),
        capex=abs(to_number(capex_raw)),
        eps=to_number(is_.get("基本每股盈餘")),
    )


def try_get_snapshot(company_id: str, year: str, season: str) -> "FinancialSnapshot | None":
    """跟 get_snapshot 一樣，但查詢失敗時回傳 None 而不是丟例外，方便做多年度比較時optional 跳過。"""
    try:
        return get_snapshot(company_id, year, season)
    except Exception:  # noqa: BLE001
        return None


def piotroski_f_score(current: FinancialSnapshot, previous: FinancialSnapshot) -> dict:
    """
    Piotroski F-Score：9 項體質檢查，每項 0 或 1 分，總分 0~9。
    用「今年 vs 去年同季」比較財務體質是否在變好。
    """
    items = []

    def add(key, label, passed, current_value, previous_value, desc):
        items.append(
            {
                "key": key,
                "label": label,
                "score": 1 if passed else 0,
                "current": current_value,
                "previous": previous_value,
                "description": desc,
            }
        )

    # --- 獲利能力 4 項 ---
    add("roa_positive", "ROA 為正", current.roa > 0, current.roa, None, "淨利/資產總額 > 0，代表本期有賺錢")
    add(
        "ocf_positive",
        "營運現金流為正",
        current.operating_cash_flow > 0,
        current.operating_cash_flow,
        None,
        "本業實際收到現金，不是只有帳上淨利",
    )
    add(
        "roa_improving",
        "ROA 較去年提升",
        current.roa > previous.roa,
        current.roa,
        previous.roa,
        "獲利能力是否比去年同期進步",
    )
    add(
        "accruals",
        "現金流品質優於淨利",
        current.operating_cash_flow > current.net_income,
        current.operating_cash_flow,
        current.net_income,
        "營運現金流 > 淨利，代表獲利的「含金量」高，不是靠應收帳款衝出來的",
    )

    # --- 槓桿與流動性 3 項 ---
    add(
        "leverage_improving",
        "長期負債比率下降",
        current.long_term_debt_ratio < previous.long_term_debt_ratio,
        current.long_term_debt_ratio,
        previous.long_term_debt_ratio,
        "長期負債/資產總額是否比去年降低，代表財務槓桿風險下降",
    )
    add(
        "current_ratio_improving",
        "流動比率上升",
        current.current_ratio > previous.current_ratio,
        current.current_ratio,
        previous.current_ratio,
        "流動資產/流動負債是否比去年提升，代表短期償債能力變好",
    )
    add(
        "no_dilution",
        "股本未膨脹（無明顯稀釋）",
        current.shares_proxy <= previous.shares_proxy,
        current.shares_proxy,
        previous.shares_proxy,
        "股本合計沒有增加，代表沒有透過大量現金增資稀釋股東權益",
    )

    # --- 營運效率 2 項 ---
    add(
        "gross_margin_improving",
        "毛利率提升",
        current.gross_margin > previous.gross_margin,
        current.gross_margin,
        previous.gross_margin,
        "營業毛利/營業收入是否比去年提升，代表產品或定價能力變強",
    )
    add(
        "asset_turnover_improving",
        "總資產週轉率提升",
        current.asset_turnover > previous.asset_turnover,
        current.asset_turnover,
        previous.asset_turnover,
        "營業收入/資產總額是否比去年提升，代表資產運用效率變好",
    )

    total_score = sum(i["score"] for i in items)

    return {
        "totalScore": total_score,
        "maxScore": 9,
        "profitabilityItems": items[0:4],
        "leverageItems": items[4:7],
        "efficiencyItems": items[7:9],
    }


def altman_z_score(snap: FinancialSnapshot) -> dict:
    """
    Altman Z''-Score（非上市公司/私人企業版本）。

    規格書原版 Z-Score 的 D 項需要「市值」，但我們目前沒有串接股價資料，
    直接拿市值公式硬套會失真，所以改用學術上專門給沒有公開市值時使用的
    Z''-Score 模型（Altman, Hartzell & Peck, 1995），公式：

        Z'' = 6.56*A + 3.26*B + 6.72*C + 1.05*D

        A = 營運資本 / 資產總額        （營運資本 = 流動資產 - 流動負債）
        B = 保留盈餘 / 資產總額
        C = EBIT / 資產總額
        D = 權益總額（帳面值） / 負債總額   ← 用帳面權益取代市值

    風險分區（Z''-Score 專用門檻，跟原始 Z-Score 的 2.99 / 1.81 不同）：
        > 2.6   安全區
        1.1~2.6 灰色區
        < 1.1   危險區
    """
    working_capital = snap.current_assets - snap.current_liabilities
    total_assets = snap.total_assets

    a = (working_capital / total_assets) if total_assets else 0.0
    b = (snap.retained_earnings / total_assets) if total_assets else 0.0
    c = (snap.ebit / total_assets) if total_assets else 0.0
    d = (snap.total_equity / snap.total_liabilities) if snap.total_liabilities else 0.0

    weighted_a = a * 6.56
    weighted_b = b * 3.26
    weighted_c = c * 6.72
    weighted_d = d * 1.05

    z = weighted_a + weighted_b + weighted_c + weighted_d

    if z > 2.6:
        zone = "safe"
        zone_label = "安全區"
    elif z >= 1.1:
        zone = "grey"
        zone_label = "灰色區"
    else:
        zone = "distress"
        zone_label = "危險區"

    return {
        "score": round(z, 2),
        "zone": zone,
        "zoneLabel": zone_label,
        "components": {
            "A": {"label": "營運資本/資產總額", "value": round(a, 4), "weighted": round(weighted_a, 2)},
            "B": {"label": "保留盈餘/資產總額", "value": round(b, 4), "weighted": round(weighted_b, 2)},
            "C": {"label": "EBIT/資產總額", "value": round(c, 4), "weighted": round(weighted_c, 2)},
            "D": {"label": "帳面權益/負債總額", "value": round(d, 4), "weighted": round(weighted_d, 2)},
        },
        "note": "因尚未串接股價資料，D 項以帳面權益取代市值，採用 Altman Z''-Score 私人企業模型公式與門檻。",
    }


def dupont_trend(company_id: str, year: str, season: str, years: int = 3) -> list[dict]:
    """
    抓最近 N 年同一季的資料，組成杜邦三因子趨勢（由舊到新排序）。
    有些公司可能上市不滿 N 年、或某年度資料查詢失敗，會自動跳過該年。
    """
    rows = []
    for i in range(years - 1, -1, -1):
        y = str(int(year) - i)
        snap = try_get_snapshot(company_id, y, season)
        if snap is None:
            continue
        rows.append(
            {
                "year": y,
                "season": season,
                "netMargin": round(snap.net_margin * 100, 2),
                "assetTurnover": round(snap.asset_turnover, 2),
                "equityMultiplier": round(snap.equity_multiplier, 2),
                "roe": round(snap.roe * 100, 2),
                "roeDirect": round(snap.roe_direct * 100, 2),
            }
        )
    return rows


def cash_flow_quality_label(ratio: float) -> str:
    """依規格書的品質評估標準，把現金流品質比率轉成文字評語。"""
    if ratio >= 1.2:
        return "優秀"
    if ratio >= 1.0:
        return "良好"
    if ratio >= 0.8:
        return "尚可"
    return "需關注"


def cash_flow_analysis(snap: FinancialSnapshot) -> dict:
    """組合現金流深度分析所需的數字：品質比率、自由現金流、三大現金流結構。"""
    quality = snap.cash_flow_quality
    return {
        "operatingCashFlow": snap.operating_cash_flow,
        "investingCashFlow": snap.investing_cash_flow,
        "financingCashFlow": snap.financing_cash_flow,
        "capex": snap.capex,
        "freeCashFlow": snap.free_cash_flow,
        "qualityRatio": round(quality, 2),
        "qualityLabel": cash_flow_quality_label(quality),
    }


if __name__ == "__main__":
    # 範例：跟截圖一樣抓台積電 2330，113年第4季（近似民國年報）
    snap = get_snapshot("2330", "113", "4")
    print(snap.summary())
