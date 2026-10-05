"""
財報健診 - 批次觀察名單模組

輸入一份股票代號清單，跑出一整張像截圖「觀察名單」那樣的比較表：
    股票代號 / ROE / 負債比 / 現金流品質

用法：
    ./venv/bin/python watchlist.py
    或在其他程式裡：
        from watchlist import build_watchlist
        df = build_watchlist(["2330", "2454", "2308"], year="113", season="4")
"""

from __future__ import annotations

import time

import pandas as pd

from metrics import get_snapshot, score_metrics

# 抓取間隔（秒），避免短時間內對 MOPS 送出過多請求被擋
REQUEST_DELAY_SECONDS = 1.0


def build_watchlist(
    company_ids: list[str],
    year: str,
    season: str,
    delay: float = REQUEST_DELAY_SECONDS,
) -> pd.DataFrame:
    """
    批次抓取多支股票的財務快照，組成比較表。

    單一股票查詢失敗（例如代號打錯、該季尚未公告）不會讓整批中斷，
    會在該列標記錯誤原因，其餘股票照常顯示。
    """
    rows = []

    for i, cid in enumerate(company_ids):
        if i > 0:
            time.sleep(delay)

        try:
            snap = get_snapshot(cid, year, season)
            rows.append(
                {
                    "股票代號": cid,
                    "ROE": round(snap.roe * 100, 1),
                    "負債比": round(snap.debt_ratio * 100, 1),
                    "現金流品質": round(snap.cash_flow_quality, 2),
                    "淨利率": round(snap.net_margin * 100, 1),
                    "總資產週轉率": round(snap.asset_turnover, 2),
                    "權益乘數": round(snap.equity_multiplier, 2),
                    "營業收入": snap.revenue,
                    "本期淨利": snap.net_income,
                    "狀態": "OK",
                }
            )
        except Exception as e:  # noqa: BLE001 - 批次查詢時任何單一失敗都要能繼續跑
            rows.append(
                {
                    "股票代號": cid,
                    "ROE": None,
                    "負債比": None,
                    "現金流品質": None,
                    "淨利率": None,
                    "總資產週轉率": None,
                    "權益乘數": None,
                    "營業收入": None,
                    "本期淨利": None,
                    "狀態": f"失敗: {e}",
                }
            )

    df = pd.DataFrame(rows)
    return df


def score_watchlist(df: pd.DataFrame) -> pd.DataFrame:
    """幫比較表加上「綜合評分」欄位，公式定義見 metrics.score_metrics。"""
    def calc(row):
        if row["狀態"] != "OK":
            return None
        return score_metrics(row["ROE"], row["負債比"], row["現金流品質"])

    df = df.copy()
    df["綜合評分"] = df.apply(calc, axis=1)
    return df


if __name__ == "__main__":
    # 範例：跟截圖觀察名單類似的一組股票
    watch_ids = ["2330", "2454", "2308", "2603", "1101"]

    df = build_watchlist(watch_ids, year="113", season="4")
    df = score_watchlist(df)

    df_sorted = df.sort_values("綜合評分", ascending=False, na_position="last")

    pd.set_option("display.unicode.east_asian_width", True)
    pd.set_option("display.width", 120)
    print(df_sorted.to_string(index=False))
