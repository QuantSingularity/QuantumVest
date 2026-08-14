import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import BlockchainScreen from "../BlockchainScreen";
import { blockchainAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

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

jest.mock("../../context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

// useFocusEffect requires a real NavigationContainer ancestor; running the
// callback like a mount effect keeps these tests focused on the screen
// itself rather than navigation plumbing.
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback) => {
    const React = require("react");
    React.useEffect(() => {
      const cleanup = callback();
      return typeof cleanup === "function" ? cleanup : undefined;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
  },
}));

const navigation = { goBack: jest.fn(), navigate: jest.fn() };

const connectedStatus = {
  success: true,
  connected: true,
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

const renderScreen = () =>
  render(
    <PaperProvider>
      <BlockchainScreen navigation={navigation} />
    </PaperProvider>,
  );

describe("BlockchainScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { role: "client" } });
  });

  it("shows a disconnected empty state when no chain is reachable", async () => {
    blockchainAPI.status.mockResolvedValueOnce({ data: disconnectedStatus });
    const { getByText, queryByText } = renderScreen();

    await waitFor(() =>
      expect(getByText("No blockchain connection")).toBeTruthy(),
    );
    expect(queryByText("Price trend")).toBeNull();
  });

  it("renders network info and contract chips when connected", async () => {
    blockchainAPI.status.mockResolvedValueOnce({ data: connectedStatus });
    const { getByText } = renderScreen();

    await waitFor(() => expect(getByText("Network")).toBeTruthy());
    expect(getByText("1337")).toBeTruthy();
    expect(getByText("Data Tracking")).toBeTruthy();
    expect(getByText("Not deployed")).toBeTruthy(); // QuantumVestOracle
  });

  it("looks up on-chain market data for a ticker", async () => {
    blockchainAPI.status.mockResolvedValueOnce({ data: connectedStatus });
    blockchainAPI.getMarketData.mockResolvedValueOnce({
      data: {
        success: true,
        ticker: "ETH",
        data: [{ timestamp: 1700000000, price: 2500, volume: 10 }],
      },
    });

    const { getByText, findByText, getAllByText } = renderScreen();
    await waitFor(() => expect(getByText("On-chain market data")).toBeTruthy());

    fireEvent.press(getAllByText("Look up")[0]);

    await waitFor(() =>
      expect(blockchainAPI.getMarketData).toHaveBeenCalledWith("ETH"),
    );
    expect(await findByText("2500")).toBeTruthy();
  });

  it("does not show the admin-only record form for a non-admin user", async () => {
    useAuth.mockReturnValue({ user: { role: "client" } });
    blockchainAPI.status.mockResolvedValueOnce({ data: connectedStatus });

    const { getByText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText("On-chain market data")).toBeTruthy());

    expect(queryByText("Record a data point (Admin)")).toBeNull();
  });

  it("shows the admin-only record form for an admin user", async () => {
    useAuth.mockReturnValue({ user: { role: "admin" } });
    blockchainAPI.status.mockResolvedValueOnce({ data: connectedStatus });

    const { getByText } = renderScreen();
    await waitFor(() =>
      expect(getByText("Record a data point (Admin)")).toBeTruthy(),
    );
  });

  it("shows an error message when the status request fails", async () => {
    blockchainAPI.status.mockRejectedValueOnce({
      response: { data: { error: "boom" } },
    });

    const { findByText } = renderScreen();
    expect(await findByText("boom")).toBeTruthy();
  });
});
