import logging
from typing import List

from sklearn.ensemble import RandomForestRegressor

logger = logging.getLogger(__name__)


def build_tree_model(name: str, seed: int):
    if name == "xgboost":
        import xgboost as xgb

        return xgb.XGBRegressor(
            n_estimators=300,
            max_depth=3,
            learning_rate=0.03,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=5,
            reg_lambda=5.0,
            random_state=seed,
            n_jobs=1,
            verbosity=0,
        )
    if name == "lightgbm":
        import lightgbm as lgb

        return lgb.LGBMRegressor(
            n_estimators=300,
            num_leaves=8,
            max_depth=4,
            learning_rate=0.03,
            subsample=0.8,
            subsample_freq=1,
            colsample_bytree=0.8,
            min_child_samples=20,
            reg_lambda=5.0,
            random_state=seed,
            n_jobs=1,
            verbose=-1,
        )
    if name == "catboost":
        from catboost import CatBoostRegressor

        return CatBoostRegressor(
            iterations=300,
            depth=4,
            learning_rate=0.03,
            l2_leaf_reg=5.0,
            random_seed=seed,
            thread_count=1,
            verbose=False,
            allow_writing_files=False,
        )
    if name == "random_forest":
        return RandomForestRegressor(
            n_estimators=200,
            max_depth=5,
            min_samples_leaf=10,
            max_features=0.5,
            random_state=seed,
            n_jobs=1,
        )
    raise ValueError(f"Unknown tree model: {name}")


def ensemble_components() -> List[str]:
    components = []
    for name in ("xgboost", "lightgbm", "random_forest", "catboost"):
        try:
            build_tree_model(name, 0)
        except ImportError:
            logger.info("Skipping unavailable ensemble component %s", name)
            continue
        components.append(name)
    return components
