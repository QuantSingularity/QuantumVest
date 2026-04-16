import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Dashboard from "../../components/pages/Dashboard";
import { marketDataAPI, portfolioAPI } from "../../services/api";

// Mock the API modules
jest.mock("../../services/api");

describe("Dashboard Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders dashboard title", async () => {
    // Mock API responses
    marketDataAPI.getBlockchainData.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });

    portfolioAPI.getPortfolio.mockResolvedValue({
      data: {
        success: true,
        portfolios: [],
      },
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Investment Dashboard")).toBeInTheDocument();
    });
  });

  test("displays loading state initially", () => {
    marketDataAPI.getBlockchainData.mockImplementation(
      () => new Promise(() => {}),
    );
    portfolioAPI.getPortfolio.mockImplementation(() => new Promise(() => {}));

    render(<Dashboard />);

    expect(screen.getByText(/loading dashboard data/i)).toBeInTheDocument();
  });

  test("displays stats cards", async () => {
    marketDataAPI.getBlockchainData.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });

    portfolioAPI.getPortfolio.mockResolvedValue({
      data: {
        success: true,
        portfolios: [],
      },
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Total Assets")).toBeInTheDocument();
      expect(screen.getByText("Total Gain/Loss")).toBeInTheDocument();
      expect(screen.getByText("Performance")).toBeInTheDocument();
    });
  });

  test("handles API errors gracefully", async () => {
    marketDataAPI.getBlockchainData.mockRejectedValue(
      new Error("Network error"),
    );
    portfolioAPI.getPortfolio.mockRejectedValue(new Error("Network error"));

    render(<Dashboard />);

    await waitFor(() => {
      expect(
        screen.getByText(/unable to load dashboard data/i),
      ).toBeInTheDocument();
    });
  });

  test("displays market data when available", async () => {
    const mockMarketData = [
      {
        timestamp: Date.now() / 1000,
        price: "3000.50",
        volume: "1000000",
      },
    ];

    marketDataAPI.getBlockchainData.mockResolvedValue({
      data: {
        success: true,
        data: mockMarketData,
      },
    });

    portfolioAPI.getPortfolio.mockResolvedValue({
      data: {
        success: true,
        portfolios: [],
      },
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Recent Market Data")).toBeInTheDocument();
    });
  });
});
