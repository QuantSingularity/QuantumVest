import os
import sys

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


@pytest.fixture
def ohlcv():
    from ai_models.tests.helpers import make_ohlcv

    return make_ohlcv(500)


@pytest.fixture
def returns():
    rng = np.random.default_rng(1)
    cov = np.array(
        [[1, 0.5, 0.2, 0.1], [0.5, 1.5, 0.3, 0.2], [0.2, 0.3, 0.8, 0.1], [0.1, 0.2, 0.1, 0.5]]
    ) * 1e-4
    mu = np.array([0.0006, 0.0009, 0.0004, 0.0003])
    return pd.DataFrame(rng.multivariate_normal(mu, cov, 500), columns=list("ABCD"))
