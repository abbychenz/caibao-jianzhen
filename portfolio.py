"""
財富管家 - 個人投資組合模組

負責兩件事：
1. 交易紀錄的儲存（買進/賣出），用 SQLite 存在本機檔案，個人使用夠用，
   之後真的要多使用者/上雲端再換成正式資料庫。
2. 從交易紀錄計算「持股」：股數、加權平均成本、已實現損益。

計算邏輯採用最常見的「加權平均成本法」：
    買進：新總成本 = 舊總成本 + 買進股數×買進價；平均成本 = 新總成本 / 新總股數
    賣出：已實現損益 += 賣出股數 × (賣出價 - 目前平均成本)；
          平均成本不變，總成本按比例減少
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass, field
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "data" / "portfolio.db"


def _get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """建立交易紀錄資料表（如果還不存在）。"""
    with _get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company_id TEXT NOT NULL,
                action TEXT NOT NULL CHECK (action IN ('buy', 'sell')),
                shares REAL NOT NULL CHECK (shares > 0),
                price REAL NOT NULL CHECK (price >= 0),
                trade_date TEXT NOT NULL,
                note TEXT DEFAULT '',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def add_transaction(company_id: str, action: str, shares: float, price: float, trade_date: str, note: str = "") -> int:
    """新增一筆買進/賣出紀錄，回傳新紀錄的 id。"""
    if action not in ("buy", "sell"):
        raise ValueError("action 必須是 'buy' 或 'sell'")
    if shares <= 0:
        raise ValueError("股數必須大於 0")
    if price < 0:
        raise ValueError("價格不能是負數")

    if action == "sell":
        holding = get_holding(company_id)
        if holding["shares"] < shares:
            raise ValueError(
                f"賣出股數（{shares}）超過目前持有股數（{holding['shares']}），請確認輸入是否正確"
            )

    with _get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO transactions (company_id, action, shares, price, trade_date, note)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (company_id, action, shares, price, trade_date, note),
        )
        return cursor.lastrowid


def delete_transaction(transaction_id: int) -> None:
    with _get_connection() as conn:
        conn.execute("DELETE FROM transactions WHERE id = ?", (transaction_id,))


def list_transactions(company_id: str | None = None) -> list[dict]:
    """列出交易紀錄，依日期由新到舊排序。可選擇只看某一檔股票。"""
    with _get_connection() as conn:
        if company_id:
            rows = conn.execute(
                "SELECT * FROM transactions WHERE company_id = ? ORDER BY trade_date DESC, id DESC",
                (company_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM transactions ORDER BY trade_date DESC, id DESC"
            ).fetchall()
        return [dict(row) for row in rows]


def list_held_company_ids() -> list[str]:
    """目前有交易紀錄的股票代號清單（去重）。"""
    with _get_connection() as conn:
        rows = conn.execute("SELECT DISTINCT company_id FROM transactions").fetchall()
        return [row["company_id"] for row in rows]


@dataclass
class Holding:
    company_id: str
    shares: float = 0.0
    avg_cost: float = 0.0
    total_cost: float = 0.0
    realized_pnl: float = 0.0
    transactions: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "companyId": self.company_id,
            "shares": round(self.shares, 4),
            "avgCost": round(self.avg_cost, 2),
            "totalCost": round(self.total_cost, 2),
            "realizedPnl": round(self.realized_pnl, 2),
        }


def get_holding(company_id: str) -> dict:
    """計算單一股票目前的持股狀態（股數、平均成本、已實現損益）。"""
    txs = list_transactions(company_id)
    # 用交易日期由舊到新重新處理，才能正確累計加權平均成本
    txs_chronological = sorted(txs, key=lambda t: (t["trade_date"], t["id"]))

    shares = 0.0
    total_cost = 0.0
    realized_pnl = 0.0

    for tx in txs_chronological:
        if tx["action"] == "buy":
            total_cost += tx["shares"] * tx["price"]
            shares += tx["shares"]
        else:  # sell
            avg_cost = (total_cost / shares) if shares else 0.0
            realized_pnl += tx["shares"] * (tx["price"] - avg_cost)
            shares -= tx["shares"]
            total_cost = avg_cost * shares  # 平均成本不變，總成本按剩餘股數等比例調整

    avg_cost = (total_cost / shares) if shares else 0.0

    return {
        "shares": shares,
        "avgCost": avg_cost,
        "totalCost": total_cost,
        "realizedPnl": realized_pnl,
    }


def get_all_holdings() -> list[dict]:
    """回傳所有曾經交易過的股票的目前持股狀態（含股數為 0 的已全部賣出者）。"""
    return [{"companyId": cid, **get_holding(cid)} for cid in list_held_company_ids()]
