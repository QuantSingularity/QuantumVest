import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Blockchain from "../../components/pages/Blockchain";
import { blockchainAPI } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

jest.mock("../../services/api", () => ({
  blockchainAPI: {
    status: jest.fn(),
    getTrend: jest.fn(),
    getMarketData: jest.fn(),
    recordMarketData: jest.fn(),
    getTokenBalance: jest.fn(),
    getOraclePrice: jest.fn(),
  },
}));

jest.mock("../../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

const connectedStatus = {
  success: true,
  connected: true,
  provider: "http://ganache:8545",
  chain_id: 1337,
  network_id: "1337",
  block_number: 42,
  contracts: {
    DataTracking: "0x1111111111111111111111111111111111111a",
    TrendAnalysis: "0x2222222222222222222222222222222222222b",
    QuantumVestToken: "0x3333333333333333333333333333333333333c",
    QuantumVestOracle: null,
  },
};

const disconnectedStatus = {
  success: true,
  connected: false,
  provider: "http://localhost:8545",
};

describe("Blockchain page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { role: "client" } });
  });

  test("shows a loading state while status is being fetched", async () => {
    let resolveStatus;
    blockchainAPI.status.mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve;
      }),
    );
    render(<Blockchain />);
    expect(document.querySelector(".loading-fullscreen")).toBeInTheDocument();

    await act(async () => {
      resolveStatus({ data: disconnectedStatus });
    });
  });

  test("shows a disconnected empty state when no chain is reachable", async () => {
    blockchainAPI.status.mockResolvedValueOnce({ data: disconnectedStatus });
    render(<Blockchain />);

    await waitFor(() =>
      expect(screen.getByText("Disconnected")).toBeInTheDocument(),
    );
    expect(screen.getByText("No blockchain connection")).toBeInTheDocument();
    // Read-heavy sections shouldn't render at all when disconnected.
    expect(screen.queryByText("Price trend")).not.toBeInTheDocument();
  });

  test("renders network info and contract rows when connected", async () => {
    blockchainAPI.status.mockResolvedValueOnce({ data: connectedStatus });
    blockchainAPI.getTrend.mockResolvedValueOnce({
      data: {
        success: true,
        price: 200000000000,
        moving_average: 205000000000,
        window: 7,
      },
    });

    render(<Blockchain />);

    await waitFor(() =>
      expect(screen.getByText("Connected")).toBeInTheDocument(),
    );
    expect(screen.getByText("1337")).toBeInTheDocument(); // chain id
    expect(screen.getByText("Data Tracking")).toBeInTheDocument();
    expect(screen.getByText("Trend Analysis")).toBeInTheDocument();
    // QuantumVestOracle has a null address in the fixture above.
    expect(screen.getByText("Not deployed")).toBeInTheDocument();
  });

  test("auto-loads the price trend once TrendAnalysis is known to be deployed", async () => {
    blockchainAPI.status.mockResolvedValueOnce({ data: connectedStatus });
    blockchainAPI.getTrend.mockResolvedValueOnce({
      data: {
        success: true,
        price: 200000000000,
        moving_average: 205000000000,
        window: 7,
      },
    });

    render(<Blockchain />);

    await waitFor(() => expect(blockchainAPI.getTrend).toHaveBeenCalledWith(7));
    await waitFor(() =>
      expect(screen.getByText("200,000,000,000")).toBeInTheDocument(),
    );
  });

  test("looks up on-chain market data for a ticker", async () => {
    const user = userEvent.setup();
    blockchainAPI.status.mockResolvedValueOnce({ data: connectedStatus });
    blockchainAPI.getTrend.mockResolvedValueOnce({
      data: { success: true, price: 1, window: 7 },
    });
    blockchainAPI.getMarketData.mockResolvedValueOnce({
      data: {
        success: true,
        ticker: "ETH",
        data: [{ timestamp: 1700000000, price: 2500, volume: 10 }],
      },
    });

    render(<Blockchain />);
    await waitFor(() =>
      expect(screen.getByText("Connected")).toBeInTheDocument(),
    );

    await user.click(screen.getAllByRole("button", { name: /look up/i })[0]);

    await waitFor(() =>
      expect(blockchainAPI.getMarketData).toHaveBeenCalledWith("ETH"),
    );
    expect(await screen.findByText("2,500")).toBeInTheDocument();
  });

  test("does not show the admin-only record form for a non-admin user", async () => {
    useAuth.mockReturnValue({ user: { role: "client" } });
    blockchainAPI.status.mockResolvedValueOnce({ data: connectedStatus });
    blockchainAPI.getTrend.mockResolvedValueOnce({
      data: { success: true, price: 1, window: 7 },
    });

    render(<Blockchain />);
    await waitFor(() =>
      expect(screen.getByText("Connected")).toBeInTheDocument(),
    );

    expect(screen.queryByText("Record a data point")).not.toBeInTheDocument();
  });

  test("shows the admin-only record form for an admin user", async () => {
    useAuth.mockReturnValue({ user: { role: "admin" } });
    blockchainAPI.status.mockResolvedValueOnce({ data: connectedStatus });
    blockchainAPI.getTrend.mockResolvedValueOnce({
      data: { success: true, price: 1, window: 7 },
    });

    render(<Blockchain />);
    await waitFor(() =>
      expect(screen.getByText("Connected")).toBeInTheDocument(),
    );

    expect(screen.getByText("Record a data point")).toBeInTheDocument();
  });

  test("looks up a QVT token balance", async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({ user: { role: "client" } });
    blockchainAPI.status.mockResolvedValueOnce({ data: connectedStatus });
    blockchainAPI.getTrend.mockResolvedValueOnce({
      data: { success: true, price: 1, window: 7 },
    });
    blockchainAPI.getTokenBalance.mockResolvedValueOnce({
      data: {
        success: true,
        address: "0xabc0000000000000000000000000000000abc0",
        balance_wei: "1000000000000000000",
        balance: "1",
      },
    });

    render(<Blockchain />);
    await waitFor(() =>
      expect(screen.getByText("Connected")).toBeInTheDocument(),
    );

    await user.type(
      screen.getByLabelText("Wallet address"),
      "0xabc0000000000000000000000000000000abc0",
    );
    await user.click(screen.getAllByRole("button", { name: /look up/i })[1]);

    await waitFor(() =>
      expect(blockchainAPI.getTokenBalance).toHaveBeenCalledWith(
        "0xabc0000000000000000000000000000000abc0",
      ),
    );
    expect(await screen.findByText("1 QVT")).toBeInTheDocument();
  });

  test("shows an error message when the status request fails", async () => {
    blockchainAPI.status.mockRejectedValueOnce({
      response: { data: { error: "boom" } },
    });

    render(<Blockchain />);

    await waitFor(() => expect(screen.getByText("boom")).toBeInTheDocument());
  });
});
