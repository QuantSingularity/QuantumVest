from typing import List

import numpy as np
import pandas as pd
from ai_models.exceptions import DataError

OHLCV = ("open", "high", "low", "close", "volume")
MIN_ROWS = 160

FEATURE_COLUMNS: List[str] = [
    "ret_1",
    "ret_2",
    "ret_3",
    "ret_5",
    "ret_10",
    "ret_20",
    "ret_1_lag_1",
    "ret_1_lag_2",
    "ret_1_lag_3",
    "ret_1_lag_5",
    "vol_5",
    "vol_10",
    "vol_20",
    "vol_60",
    "vol_ratio_5_20",
    "skew_20",
    "kurt_20",
    "ma_ratio_5",
    "ma_ratio_10",
    "ma_ratio_20",
    "ma_ratio_50",
    "ema_ratio_12",
    "ema_ratio_26",
    "macd_norm",
    "macd_signal_norm",
    "macd_hist_norm",
    "rsi_14",
    "bb_position",
    "bb_width",
    "stoch_k_14",
    "atr_14_norm",
    "hl_range",
    "gap",
    "volume_ratio_20",
    "volume_change",
    "dow_sin",
    "dow_cos",
    "month_sin",
    "month_cos",
]


def normalize_ohlcv(data: pd.DataFrame) -> pd.DataFrame:
    if data is None or len(data) == 0:
        raise DataError("No price data provided")
    df = data.copy()
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    for time_col in ("timestamp", "date", "datetime", "time"):
        if time_col in df.columns:
            df = df.set_index(time_col)
            break
    if not isinstance(df.index, pd.DatetimeIndex):
        try:
            df.index = pd.to_datetime(df.index, utc=True)
        except (TypeError, ValueError):
            df.index = pd.date_range(
                end=pd.Timestamp.utcnow().normalize(), periods=len(df), freq="B"
            )
    elif df.index.tz is None:
        df.index = df.index.tz_localize("UTC")
    df.index = df.index.tz_convert("UTC").tz_localize(None)
    df.index.name = "timestamp"
    if "close" not in df.columns:
        if "adj_close" in df.columns:
            df["close"] = df["adj_close"]
        else:
            raise DataError("Price data must contain a 'close' column")
    df = df[~df.index.duplicated(keep="last")].sort_index()
    for col in ("open", "high", "low"):
        if col not in df.columns:
            df[col] = df["close"]
    if "volume" not in df.columns:
        df["volume"] = 0.0
    df = df[list(OHLCV)].apply(pd.to_numeric, errors="coerce")
    df = df.replace([np.inf, -np.inf], np.nan)
    df[["open", "high", "low", "close"]] = df[["open", "high", "low", "close"]].ffill()
    df["volume"] = df["volume"].fillna(0.0)
    df = df.dropna(subset=["close"])
    df = df[df["close"] > 0]
    df["open"] = df["open"].where(df["open"] > 0, df["close"])
    df["high"] = np.maximum(df["high"], df[["open", "close"]].max(axis=1))
    df["low"] = np.minimum(df["low"], df[["open", "close"]].min(axis=1))
    if len(df) == 0:
        raise DataError("No valid price rows after cleaning")
    return df


def _rsi(close: pd.Series, window: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / window, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / window, adjust=False).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - 100 / (1 + rs)
    rsi = rsi.where(loss != 0, 100.0)
    return rsi.where(~((gain == 0) & (loss == 0)), 50.0)


def build_features(frame: pd.DataFrame) -> pd.DataFrame:
    close = frame["close"]
    high = frame["high"]
    low = frame["low"]
    volume = frame["volume"]
    log_close = np.log(close)
    ret1 = log_close.diff()
    out = pd.DataFrame(index=frame.index)

    for n in (1, 2, 3, 5, 10, 20):
        out[f"ret_{n}"] = log_close.diff(n)
    for lag in (1, 2, 3, 5):
        out[f"ret_1_lag_{lag}"] = ret1.shift(lag)

    for n in (5, 10, 20, 60):
        out[f"vol_{n}"] = ret1.rolling(n).std()
    out["vol_ratio_5_20"] = out["vol_5"] / out["vol_20"].replace(0, np.nan)
    out["skew_20"] = ret1.rolling(20).skew()
    out["kurt_20"] = ret1.rolling(20).kurt()

    for n in (5, 10, 20, 50):
        out[f"ma_ratio_{n}"] = close / close.rolling(n).mean() - 1
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26
    macd_signal = macd.ewm(span=9, adjust=False).mean()
    out["ema_ratio_12"] = close / ema12 - 1
    out["ema_ratio_26"] = close / ema26 - 1
    out["macd_norm"] = macd / close
    out["macd_signal_norm"] = macd_signal / close
    out["macd_hist_norm"] = (macd - macd_signal) / close

    out["rsi_14"] = _rsi(close) / 100.0

    bb_mid = close.rolling(20).mean()
    bb_std = close.rolling(20).std()
    bb_width = 4 * bb_std
    out["bb_position"] = (close - (bb_mid - 2 * bb_std)) / bb_width.replace(0, np.nan)
    out["bb_width"] = bb_width / bb_mid

    low14 = low.rolling(14).min()
    high14 = high.rolling(14).max()
    span14 = (high14 - low14).replace(0, np.nan)
    out["stoch_k_14"] = (close - low14) / span14

    prev_close = close.shift(1)
    true_range = pd.concat(
        [high - low, (high - prev_close).abs(), (low - prev_close).abs()], axis=1
    ).max(axis=1)
    out["atr_14_norm"] = true_range.rolling(14).mean() / close
    out["hl_range"] = (high - low) / close
    out["gap"] = np.log(frame["open"] / prev_close)

    vol_ma = volume.rolling(20).mean()
    has_volume = vol_ma > 0
    out["volume_ratio_20"] = np.log((volume + 1.0) / (vol_ma + 1.0)).where(
        has_volume, 0.0
    )
    out["volume_change"] = (
        np.log((volume + 1.0) / (volume.shift(1) + 1.0))
        .clip(-3, 3)
        .where(has_volume, 0.0)
    )

    dow = frame.index.dayofweek.to_numpy()
    month = frame.index.month.to_numpy()
    out["dow_sin"] = np.sin(2 * np.pi * dow / 7)
    out["dow_cos"] = np.cos(2 * np.pi * dow / 7)
    out["month_sin"] = np.sin(2 * np.pi * (month - 1) / 12)
    out["month_cos"] = np.cos(2 * np.pi * (month - 1) / 12)

    out = out[FEATURE_COLUMNS].replace([np.inf, -np.inf], np.nan)
    return out


def next_return_target(frame: pd.DataFrame) -> pd.Series:
    log_close = np.log(frame["close"])
    return (log_close.shift(-1) - log_close).rename("target")


def supervised_frame(frame: pd.DataFrame) -> pd.DataFrame:
    feats = build_features(frame)
    feats["target"] = next_return_target(frame)
    return feats.dropna()
