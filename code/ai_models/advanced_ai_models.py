from ai_models.models.constants import ENSEMBLE
from ai_models.models.predictor import TimeSeriesPredictor
from ai_models.portfolio.optimizer import PortfolioOptimizer
from ai_models.risk.assessment import RiskAssessmentModel

AdvancedTimeSeriesPredictor = TimeSeriesPredictor


class ModelFactory:
    @staticmethod
    def create_predictor(model_type: str = ENSEMBLE) -> TimeSeriesPredictor:
        return TimeSeriesPredictor(model_type)

    @staticmethod
    def create_optimizer(risk_free_rate: float = 0.02) -> PortfolioOptimizer:
        return PortfolioOptimizer(risk_free_rate=risk_free_rate)

    @staticmethod
    def create_risk_assessor() -> RiskAssessmentModel:
        return RiskAssessmentModel()


__all__ = [
    "AdvancedTimeSeriesPredictor",
    "ModelFactory",
    "PortfolioOptimizer",
    "RiskAssessmentModel",
    "TimeSeriesPredictor",
]
