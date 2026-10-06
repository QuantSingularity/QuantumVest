import numpy as np
import pandas as pd
import pytest
from ai_models.data.features import (
    FEATURE_COLUMNS,
    build_features,
    normalize_ohlcv,
    supervised_frame,
)
from ai_models.exceptions import DataError


def test_normalize_accepts_mixed_case_and_timestamp_column(ohlcv):
    df = ohlcv.rename(columns=str.upper)
    frame = normalize_ohlcv(df)
    assert list(frame.columns) == ["open", "high", "low", "close", "volume"]
    assert frame.index.is_monotonic_increasing
    assert frame.index.tz is None


def test_normalize_handles_tz_aware_and_duplicates(ohlcv):
    df = ohlcv.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"]).dt.tz_localize("America/New_York")
    df = pd.concat([df, df.iloc[[5]]])
    frame = normalize_ohlcv(df)
    assert frame.index.is_unique
    assert len(frame) == len(ohlcv)


def test_normalize_requires_close():
    with pytest.raises(DataError):
        normalize_ohlcv(pd.DataFrame({"open": [1, 2, 3]}))


def test_normalize_drops_nonpositive_prices(ohlcv):
    df = ohlcv.copy()
    df.loc[10, "close"] = -1.0
    frame = normalize_ohlcv(df)
    assert (frame["close"] > 0).all()
    assert len(frame) == len(ohlcv) - 1


def test_features_have_no_lookahead(ohlcv):
    frame = normalize_ohlcv(ohlcv)
    full = build_features(frame)
    partial = build_features(frame.iloc[:300])
    a = full.iloc[:300].to_numpy()
    b = partial.to_numpy()
    assert np.allclose(a, b, equal_nan=True)


def test_feature_columns_complete_and_finite(ohlcv):
    feats = build_features(normalize_ohlcv(ohlcv)).dropna()
    assert list(feats.columns) == FEATURE_COLUMNS
    assert np.isfinite(feats.to_numpy()).all()


def test_target_is_next_period_return(ohlcv):
    frame = normalize_ohlcv(ohlcv)
    data = supervised_frame(frame)
    ts = data.index[10]
    pos = frame.index.get_loc(ts)
    expected = np.log(frame["close"].iloc[pos + 1] / frame["close"].iloc[pos])
    assert data["target"].iloc[10] == pytest.approx(expected)


def test_zero_volume_does_not_break_features(ohlcv):
    df = ohlcv.copy()
    df["volume"] = 0.0
    feats = build_features(normalize_ohlcv(df)).dropna()
    assert len(feats) > 0
    assert np.isfinite(feats.to_numpy()).all()
