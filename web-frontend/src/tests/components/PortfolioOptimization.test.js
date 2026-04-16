import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import PortfolioOptimization from "../../components/pages/PortfolioOptimization";
import { portfolioAPI } from "../../services/api";

jest.mock("../../services/api");
jest.mock("../../components/ui/ToastManager", () => ({
  showToast: jest.fn(),
}));

describe("PortfolioOptimization Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders portfolio optimization title", () => {
    render(<PortfolioOptimization />);
    expect(screen.getByText("Portfolio Optimization")).toBeInTheDocument();
  });

  test("displays current allocation section", () => {
    render(<PortfolioOptimization />);
    expect(screen.getByText("Current Allocation")).toBeInTheDocument();
  });

  test("displays risk tolerance slider", () => {
    render(<PortfolioOptimization />);
    expect(screen.getByText("Risk Tolerance")).toBeInTheDocument();
    expect(screen.getByText("Conservative")).toBeInTheDocument();
    expect(screen.getByText("Aggressive")).toBeInTheDocument();
  });

  test("displays optimize button", () => {
    render(<PortfolioOptimization />);
    expect(screen.getByText("Optimize Portfolio")).toBeInTheDocument();
  });

  test("shows all asset allocations", () => {
    render(<PortfolioOptimization />);
    expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    expect(screen.getByText("Ethereum")).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
  });

  test("allows changing risk level", () => {
    render(<PortfolioOptimization />);
    const riskSlider = screen.getAllByRole("slider")[0];
    fireEvent.change(riskSlider, { target: { value: "7" } });
    expect(screen.getByText("Level: 7")).toBeInTheDocument();
  });

  test("optimize button triggers optimization", async () => {
    portfolioAPI.optimizePortfolio.mockRejectedValue(
      new Error("API unavailable"),
    );

    render(<PortfolioOptimization />);
    const optimizeButton = screen.getByText("Optimize Portfolio");

    fireEvent.click(optimizeButton);

    await waitFor(() => {
      expect(screen.getByText("Optimizing...")).toBeInTheDocument();
    });
  });

  test("displays optimization results after optimization", async () => {
    portfolioAPI.optimizePortfolio.mockRejectedValue(
      new Error("API unavailable"),
    );

    render(<PortfolioOptimization />);
    const optimizeButton = screen.getByText("Optimize Portfolio");

    fireEvent.click(optimizeButton);

    await waitFor(
      () => {
        expect(screen.getByText("Optimized Portfolio")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  test("displays total allocation percentage", () => {
    render(<PortfolioOptimization />);
    expect(screen.getByText(/Total:/)).toBeInTheDocument();
  });
});
