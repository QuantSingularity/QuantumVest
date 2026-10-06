# ai_models

Forecasting, portfolio optimization and risk models used by the QuantumVest backend.

## Layout

| Package       | Responsibility                                                          |
| ------------- | ----------------------------------------------------------------------- |
| `data`        | OHLCV normalization, leak-free features, loaders, preprocessing         |
| `models`      | Ensemble (XGBoost, LightGBM, random forest, CatBoost), LSTM, Transformer |
| `portfolio`   | Constrained optimizer, discrete allocation, forecast blending           |
| `risk`        | VaR, expected shortfall, drawdown, stress tests, risk contributions     |
| `evaluation`  | Forecast scoring, walk-forward portfolio backtests                      |
| `serving`     | On-disk model store and the train-on-demand prediction engine           |
| `training`    | Command line entry points for offline training                          |
| `exceptions`  | Shared exception hierarchy rooted at `AIModelsError`                    |
| `tests`       | Unit tests mirroring the package layout                                 |

Public names are re-exported from the top-level package:

```python
from ai_models import TimeSeriesPredictor, PortfolioOptimizer, RiskAssessmentModel
```

## Commands

Run from the `code` directory:

```bash
pip install -r ai_models/requirements-dev.txt
python -m pytest ai_models
python -m ai_models.training.prediction --symbol AAPL --model-type lstm
python -m ai_models.training.optimization --symbols AAPL,MSFT,GOOGL --evaluate
python -m ai_models.training.pipeline --symbols AAPL MSFT BTC:crypto
```

LSTM and Transformer models additionally require `tensorflow-cpu`.
