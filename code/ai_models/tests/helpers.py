import numpy as np
import pandas as pd


def make_ohlcv(n=500, seed=0, freq="B", start="2022-01-03"):
    rng = np.random.default_rng(seed)
    idx = pd.date_range(start, periods=n, freq=freq)
    rets = np.zeros(n)
    sig = np.full(n, 0.015)
    for i in range(1, n):
        sig[i] = np.sqrt(0.00001 + 0.1 * rets[i - 1] ** 2 + 0.85 * sig[i - 1] ** 2)
        rets[i] = 0.0004 + 0.08 * rets[i - 1] + sig[i] * rng.standard_normal()
    close = 100 * np.exp(np.cumsum(rets))
    open_ = close * np.exp(rng.normal(0, 0.003, n))
    high = np.maximum(open_, close) * (1 + np.abs(rng.normal(0, 0.004, n)))
    low = np.minimum(open_, close) * (1 - np.abs(rng.normal(0, 0.004, n)))
    volume = rng.integers(1_000_000, 5_000_000, n).astype(float)
    return pd.DataFrame(
        {
            "timestamp": idx,
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "volume": volume,
        }
    )
