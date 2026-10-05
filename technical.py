"""
財富管家 - 技術分析模組

用 twse_client.py 抓到的歷史日 K 資料（開高低收、成交量），
計算常見技術指標：均線、RSI、MACD、KD、布林通道、支撐壓力位，
並組合成一個 0~100 的「技術分數」給一個白話判斷（強烈看多～強烈看空）。

注意：技術分析本質上是「歷史價格的統計規律」，不是財報基本面，
也不保證未來走勢，這裡的分數只是輔助參考，不構成投資建議。
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def _to_native(obj):
    """
    遞迴把 numpy 的數字型別（float64/int64...）轉成 Python 原生 float/int，
    不然 FastAPI 沒辦法把這些數字序列化成 JSON。
    """
    if isinstance(obj, dict):
        return {k: _to_native(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_to_native(v) for v in obj]
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, np.bool_):
        return bool(obj)
    return obj


def to_dataframe(history: list[dict]) -> pd.DataFrame:
    """把 twse_client.get_stock_history() 回傳的清單轉成 pandas DataFrame，方便算指標。"""
    df = pd.DataFrame(history)
    if df.empty:
        return df
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)
    return df


def compute_moving_averages(df: pd.DataFrame) -> dict:
    """計算 MA5/10/20/60/120/240，資料不夠的天數就回傳 None（不硬湊）。"""
    windows = [5, 10, 20, 60, 120, 240]
    result = {}
    close = df["close"]
    latest_price = close.iloc[-1]

    for w in windows:
        if len(df) >= w:
            ma = close.rolling(w).mean().iloc[-1]
            result[f"ma{w}"] = {
                "value": round(ma, 2),
                "aboveMa": bool(latest_price > ma),
            }
        else:
            result[f"ma{w}"] = None

    return result


def compute_rsi(df: pd.DataFrame, period: int = 14) -> float | None:
    """RSI(14)：相對強弱指標，衡量近期漲跌力道，通常 <30 視為超賣、>70 視為超買。"""
    if len(df) < period + 1:
        return None
    delta = df["close"].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, 1e-9)
    rsi = 100 - (100 / (1 + rs))
    value = rsi.iloc[-1]
    return round(value, 1) if pd.notna(value) else None


def compute_macd(df: pd.DataFrame, fast: int = 12, slow: int = 26, signal: int = 9) -> dict | None:
    """MACD(12,26,9)：DIF（快慢均線差） / 訊號線 / 柱狀圖，用來判斷趨勢動能。"""
    if len(df) < slow + signal:
        return None
    close = df["close"]
    ema_fast = close.ewm(span=fast, adjust=False).mean()
    ema_slow = close.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line

    return {
        "macd": round(macd_line.iloc[-1], 3),
        "signal": round(signal_line.iloc[-1], 3),
        "histogram": round(histogram.iloc[-1], 3),
        "bullish": bool(macd_line.iloc[-1] > signal_line.iloc[-1]),
    }


def compute_kd(df: pd.DataFrame, period: int = 9) -> dict | None:
    """
    KD 隨機指標（台股慣用參數 9,3,3）：
        RSV = (收盤 - n日最低) / (n日最高 - n日最低) * 100
        K   = 前一日K * 2/3 + RSV * 1/3（Wilder 平滑，初始值設 50）
        D   = 前一日D * 2/3 + K   * 1/3
    """
    if len(df) < period:
        return None
    low_n = df["low"].rolling(period).min()
    high_n = df["high"].rolling(period).max()
    rsv = (df["close"] - low_n) / (high_n - low_n).replace(0, 1e-9) * 100

    k_values = []
    d_values = []
    k_prev, d_prev = 50.0, 50.0
    for rsv_value in rsv:
        if pd.isna(rsv_value):
            k_values.append(None)
            d_values.append(None)
            continue
        k_prev = k_prev * 2 / 3 + rsv_value * 1 / 3
        d_prev = d_prev * 2 / 3 + k_prev * 1 / 3
        k_values.append(k_prev)
        d_values.append(d_prev)

    k_latest = next((v for v in reversed(k_values) if v is not None), None)
    d_latest = next((v for v in reversed(d_values) if v is not None), None)
    if k_latest is None or d_latest is None:
        return None

    return {
        "k": round(k_latest, 1),
        "d": round(d_latest, 1),
        "bullish": bool(k_latest > d_latest),
    }


def compute_bollinger(df: pd.DataFrame, period: int = 20, num_std: float = 2.0) -> dict | None:
    """布林通道(20, 2σ)：中軌=20日均線，上下軌=中軌 ± 2倍標準差，位置%越高代表越接近上軌。"""
    if len(df) < period:
        return None
    close = df["close"]
    mid = close.rolling(period).mean().iloc[-1]
    std = close.rolling(period).std().iloc[-1]
    upper = mid + num_std * std
    lower = mid - num_std * std
    latest = close.iloc[-1]

    position_pct = (latest - lower) / (upper - lower) * 100 if upper != lower else 50.0
    bandwidth_pct = (upper - lower) / mid * 100 if mid else 0.0

    if position_pct >= 50:
        zone = "上半區"
    else:
        zone = "下半區"

    return {
        "upper": round(upper, 2),
        "mid": round(mid, 2),
        "lower": round(lower, 2),
        "positionPct": round(position_pct, 1),
        "bandwidthPct": round(bandwidth_pct, 2),
        "zone": zone,
    }


def compute_support_resistance(df: pd.DataFrame, period: int = 20) -> dict | None:
    """近期支撐壓力位：最近 N 個交易日的最高價視為壓力、最低價視為支撐。"""
    if len(df) < period:
        return None
    recent = df.tail(period)
    resistance = recent["high"].max()
    support = recent["low"].min()
    latest = df["close"].iloc[-1]

    return {
        "resistance": round(resistance, 2),
        "support": round(support, 2),
        "distanceToResistancePct": round((resistance - latest) / latest * 100, 1) if latest else None,
        "distanceToSupportPct": round((latest - support) / latest * 100, 1) if latest else None,
    }


def compute_volume_analysis(df: pd.DataFrame, period: int = 20) -> dict | None:
    """成交量分析：今日量 vs 近 N 日均量，判斷是不是異常爆量或量縮。"""
    if len(df) < period:
        return None
    today_volume = df["volume"].iloc[-1]
    avg_volume = df["volume"].tail(period).mean()
    ratio = today_volume / avg_volume if avg_volume else None

    return {
        "todayVolume": today_volume,
        "avgVolume20": round(avg_volume, 0),
        "ratio": round(ratio, 2) if ratio is not None else None,
    }


def compute_technical_score(ma: dict, rsi: float | None, macd: dict | None, kd: dict | None, bollinger: dict | None) -> dict:
    """
    組合成一個 0~100 的技術分數，權重（不是嚴謹的量化模型，是可調整的起始版本）：
        均線多頭排列（價格站上幾條均線）  40%
        MACD 是否偏多                    20%
        KD 是否偏多（K>D）                20%
        RSI + 布林位置                    20%
    """
    ma_entries = [v for v in ma.values() if v is not None]
    ma_score = (sum(1 for v in ma_entries if v["aboveMa"]) / len(ma_entries) * 40) if ma_entries else 20

    macd_score = 20 if (macd and macd["bullish"]) else (0 if macd else 10)
    kd_score = 20 if (kd and kd["bullish"]) else (0 if kd else 10)

    rsi_bollinger_score = 10
    if rsi is not None:
        if 45 <= rsi <= 70:
            rsi_bollinger_score = 10  # 健康的偏多區間
        elif rsi > 70:
            rsi_bollinger_score = 6  # 超買，動能強但風險增加
        elif rsi < 30:
            rsi_bollinger_score = 2  # 超賣，偏空
        else:
            rsi_bollinger_score = 5
    if bollinger is not None:
        rsi_bollinger_score += 10 if bollinger["positionPct"] >= 50 else 3

    total = round(ma_score + macd_score + kd_score + rsi_bollinger_score)
    total = max(0, min(total, 100))

    if total >= 75:
        verdict = "強烈看多"
    elif total >= 55:
        verdict = "偏多"
    elif total >= 45:
        verdict = "中性"
    elif total >= 25:
        verdict = "偏空"
    else:
        verdict = "強烈看空"

    return {"score": total, "verdict": verdict}


def analyze(history: list[dict]) -> dict | None:
    """把一支股票的歷史 K 線資料算成完整的技術分析結果。資料不足時回傳 None。"""
    df = to_dataframe(history)
    if df.empty or len(df) < 20:
        return None

    ma = compute_moving_averages(df)
    rsi = compute_rsi(df)
    macd = compute_macd(df)
    kd = compute_kd(df)
    bollinger = compute_bollinger(df)
    support_resistance = compute_support_resistance(df)
    volume = compute_volume_analysis(df)
    score = compute_technical_score(ma, rsi, macd, kd, bollinger)

    latest = df.iloc[-1]

    result = {
        "latestDate": latest["date"].strftime("%Y-%m-%d"),
        "latestClose": latest["close"],
        "movingAverages": ma,
        "rsi": rsi,
        "macd": macd,
        "kd": kd,
        "bollinger": bollinger,
        "supportResistance": support_resistance,
        "volume": volume,
        "technicalScore": score,
        "candles": [
            {
                "date": row["date"].strftime("%Y-%m-%d"),
                "open": row["open"],
                "high": row["high"],
                "low": row["low"],
                "close": row["close"],
                "volume": row["volume"],
            }
            for _, row in df.iterrows()
        ],
    }
    return _to_native(result)
