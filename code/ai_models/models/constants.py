ENSEMBLE = "ensemble"
TREE_MODELS = ("xgboost", "lightgbm", "random_forest", "catboost")
DEEP_MODELS = ("lstm", "transformer")
MODEL_TYPES = (ENSEMBLE,) + TREE_MODELS + DEEP_MODELS
FAST_MODEL_TYPES = (ENSEMBLE, "xgboost", "lightgbm", "random_forest")
MAX_FORECAST_STEPS = 30
MIN_SAMPLES = 100
MODEL_FORMAT_VERSION = 2
