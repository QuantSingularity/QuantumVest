class AIModelsError(Exception):
    pass


class DataError(AIModelsError, ValueError):
    pass


class OptimizationError(AIModelsError, ValueError):
    pass


class InvalidSymbolError(AIModelsError, ValueError):
    pass


class NotTrainedError(AIModelsError, RuntimeError):
    pass


class ModelCompatibilityError(AIModelsError, RuntimeError):
    pass


class PredictionError(AIModelsError):
    def __init__(self, message: str, code: str = "prediction_error") -> None:
        super().__init__(message)
        self.message = message
        self.code = code
