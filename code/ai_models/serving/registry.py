import json
import os
import re
import threading
from collections import OrderedDict
from typing import Any, Dict, List, Optional, Tuple

from ai_models.exceptions import InvalidSymbolError, ModelCompatibilityError
from ai_models.models.constants import MODEL_TYPES
from ai_models.models.predictor import TimeSeriesPredictor

ASSET_TYPES = ("stock", "crypto")
_SYMBOL_RE = re.compile(r"^[A-Z0-9][A-Z0-9.\-]{0,19}$")


def normalize_symbol(symbol: Any) -> str:
    value = str(symbol or "").strip().upper()
    if not _SYMBOL_RE.match(value) or ".." in value:
        raise InvalidSymbolError(f"Invalid symbol: {symbol!r}")
    return value


def normalize_asset_type(asset_type: Any) -> str:
    value = str(asset_type or "stock").strip().lower()
    if value not in ASSET_TYPES:
        raise ValueError(f"asset_type must be one of {ASSET_TYPES}")
    return value


def normalize_model_type(model_type: Any) -> str:
    value = str(model_type or "").strip().lower()
    if value not in MODEL_TYPES:
        raise ValueError(f"model_type must be one of {MODEL_TYPES}")
    return value


class ModelStore:
    def __init__(self, base_dir: str, cache_size: int = 16) -> None:
        self.base_dir = os.path.abspath(base_dir)
        self.cache_size = int(cache_size)
        self._cache: "OrderedDict[str, Tuple[int, TimeSeriesPredictor]]" = OrderedDict()
        self._guard = threading.Lock()
        os.makedirs(self.base_dir, exist_ok=True)

    def path(self, asset_type: str, symbol: str, model_type: str) -> str:
        asset_type = normalize_asset_type(asset_type)
        symbol = normalize_symbol(symbol)
        model_type = normalize_model_type(model_type)
        return os.path.join(self.base_dir, f"{asset_type}_{symbol}_{model_type}")

    def _meta_path(self, directory: str) -> str:
        return os.path.join(directory, "meta.json")

    def exists(self, asset_type: str, symbol: str, model_type: str) -> bool:
        return os.path.isfile(self._meta_path(self.path(asset_type, symbol, model_type)))

    def metadata(
        self, asset_type: str, symbol: str, model_type: str
    ) -> Optional[Dict[str, Any]]:
        meta_path = self._meta_path(self.path(asset_type, symbol, model_type))
        try:
            with open(meta_path) as fh:
                return json.load(fh)
        except (OSError, json.JSONDecodeError):
            return None

    def save(
        self,
        predictor: TimeSeriesPredictor,
        asset_type: str,
        symbol: str,
    ) -> str:
        directory = self.path(asset_type, symbol, predictor.model_type)
        predictor.save(
            directory,
            extra={
                "symbol": normalize_symbol(symbol),
                "asset_type": normalize_asset_type(asset_type),
            },
        )
        with self._guard:
            self._cache.pop(directory, None)
        return directory

    def load(
        self, asset_type: str, symbol: str, model_type: str
    ) -> Optional[TimeSeriesPredictor]:
        directory = self.path(asset_type, symbol, model_type)
        meta_path = self._meta_path(directory)
        try:
            stamp = os.stat(meta_path).st_mtime_ns
        except OSError:
            return None
        with self._guard:
            cached = self._cache.get(directory)
            if cached and cached[0] == stamp:
                self._cache.move_to_end(directory)
                return cached[1]
        try:
            predictor = TimeSeriesPredictor.load(directory)
        except (ModelCompatibilityError, OSError, KeyError, ValueError):
            return None
        with self._guard:
            self._cache[directory] = (stamp, predictor)
            self._cache.move_to_end(directory)
            while len(self._cache) > self.cache_size:
                self._cache.popitem(last=False)
        return predictor

    def delete(self, asset_type: str, symbol: str, model_type: str) -> bool:
        import shutil

        directory = self.path(asset_type, symbol, model_type)
        with self._guard:
            self._cache.pop(directory, None)
        if os.path.isdir(directory):
            shutil.rmtree(directory)
            return True
        return False

    def list_models(
        self, asset_type: Optional[str] = None, symbol: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        wanted_type = normalize_asset_type(asset_type) if asset_type else None
        wanted_symbol = normalize_symbol(symbol) if symbol else None
        items: List[Dict[str, Any]] = []
        try:
            names = sorted(os.listdir(self.base_dir))
        except OSError:
            return items
        for name in names:
            meta_path = self._meta_path(os.path.join(self.base_dir, name))
            if name.startswith(".") or not os.path.isfile(meta_path):
                continue
            try:
                with open(meta_path) as fh:
                    meta = json.load(fh)
            except (OSError, json.JSONDecodeError):
                continue
            m_symbol = meta.get("symbol")
            m_type = meta.get("asset_type")
            if not m_symbol or not m_type:
                continue
            if wanted_type and m_type != wanted_type:
                continue
            if wanted_symbol and m_symbol != wanted_symbol:
                continue
            metrics = meta.get("metrics") or {}
            items.append(
                {
                    "symbol": m_symbol,
                    "asset_type": m_type,
                    "model_type": meta.get("model_type"),
                    "trained_at": meta.get("trained_at"),
                    "n_samples": meta.get("n_samples"),
                    "metrics": {
                        k: metrics.get(k)
                        for k in (
                            "directional_accuracy",
                            "rmse",
                            "skill_vs_naive",
                            "price_mape_pct",
                            "naive_price_mape_pct",
                            "samples",
                        )
                    },
                }
            )
        return items
