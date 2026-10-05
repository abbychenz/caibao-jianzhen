"""
財富管家 - 個人投資偏好模組

存放使用者的投資偏好設定（產業偏好、關注標的、風險偏好、單筆預算等），
讓「投資建議」引擎可以根據「你是誰」調整建議內容，不是對每個人都給一樣的答案。

用單一 JSON 欄位存所有偏好資料（而不是拆成很多欄位），
好處是之後想加新欄位（例如「投資期限」「備註」）不用改資料庫結構，
直接在 JSON 裡加新的 key 就好，前端也可以自由擴充想收集的資訊。
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "data" / "portfolio.db"

DEFAULT_PROFILE = {
    "preferredIndustries": [],   # 偏好產業，例如 ["半導體業", "金融保險業"]
    "preferredTickers": [],      # 特別關注的股票代號，例如 ["2330", "2454"]
    "riskTolerance": "穩健",     # 保守 / 穩健 / 積極
    "investmentGoal": "長期成長", # 長期成長 / 股息收入 / 短期波段
    "investmentHorizon": "中期（1-3年）",  # 短期（<1年）/ 中期（1-3年）/ 長期（3年以上）
    "typicalBudget": None,       # 單筆習慣投入金額（新台幣），沒填就是 None
    "notes": "",                 # 自由填寫，任何想讓系統知道的事
}


def _get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS profile (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                data TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def get_profile() -> dict:
    """取得目前的偏好設定，還沒設定過的話回傳預設值（不是 null，前端表單比較好處理）。"""
    with _get_connection() as conn:
        row = conn.execute("SELECT data FROM profile WHERE id = 1").fetchone()
    if row is None:
        return dict(DEFAULT_PROFILE)
    saved = json.loads(row["data"])
    # 用預設值補齊之後新加的欄位，避免舊資料缺欄位讓前端讀取出錯
    return {**DEFAULT_PROFILE, **saved}


def save_profile(profile: dict) -> dict:
    """整份覆蓋式儲存偏好設定（前端每次都送完整表單內容過來）。"""
    merged = {**DEFAULT_PROFILE, **profile}
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO profile (id, data, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP
            """,
            (json.dumps(merged, ensure_ascii=False),),
        )
    return merged
