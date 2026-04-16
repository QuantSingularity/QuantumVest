import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import PredictionChart from "../../components/pages/PredictionChart";
import { predictionAPI } from "../../services/api";

jest.mock("../../services/api");

describe("PredictionChart Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders prediction chart title", async () => {
    predictionAPI.getPrediction.mockRejectedValue(new Error("API unavailable"));

    render(<PredictionChart />);

    await waitFor(() => {
      expect(screen.getByText("Price Predictions")).toBeInTheDocument();
    });
  });

  test("displays asset selector", async () => {
    predictionAPI.getPrediction.mockRejectedValue(new Error("API unavailable"));

    render(<PredictionChart />);

    await waitFor(() => {
      expect(screen.getByLabelText("Asset:")).toBeInTheDocument();
      expect(screen.getByLabelText("Timeframe:")).toBeInTheDocument();
    });
  });

  test("allows changing asset selection", async () => {
    predictionAPI.getPrediction.mockRejectedValue(new Error("API unavailable"));

    render(<PredictionChart />);

    await waitFor(() => {
      const assetSelect = screen.getByLabelText("Asset:");
      fireEvent.change(assetSelect, { target: { value: "ETH" } });
      expect(assetSelect.value).toBe("ETH");
    });
  });

  test("allows changing timeframe selection", async () => {
    predictionAPI.getPrediction.mockRejectedValue(new Error("API unavailable"));

    render(<PredictionChart />);

    await waitFor(() => {
      const timeframeSelect = screen.getByLabelText("Timeframe:");
      fireEvent.change(timeframeSelect, { target: { value: "30d" } });
      expect(timeframeSelect.value).toBe("30d");
    });
  });

  test("displays analysis summary", async () => {
    predictionAPI.getPrediction.mockRejectedValue(new Error("API unavailable"));

    render(<PredictionChart />);

    await waitFor(() => {
      expect(screen.getByText("Analysis Summary")).toBeInTheDocument();
    });
  });

  test("generates fallback predictions when API fails", async () => {
    predictionAPI.getPrediction.mockRejectedValue(new Error("API unavailable"));

    render(<PredictionChart />);

    await waitFor(() => {
      expect(screen.getByText(/is predicted to/i)).toBeInTheDocument();
    });
  });
});
