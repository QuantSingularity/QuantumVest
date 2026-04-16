import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Analytics from "../../components/pages/Analytics";

// Mock Chart.js
jest.mock("chart.js", () => ({
  Chart: jest.fn(),
  registerables: [],
  register: jest.fn(),
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  BarElement: jest.fn(),
  ArcElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
}));

jest.mock("react-chartjs-2", () => ({
  Line: () => <div>Line Chart</div>,
  Bar: () => <div>Bar Chart</div>,
  Pie: () => <div>Pie Chart</div>,
}));

describe("Analytics Component", () => {
  test("renders analytics dashboard title", () => {
    render(<Analytics />);
    expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument();
  });

  test("displays stats cards", () => {
    render(<Analytics />);
    expect(screen.getByText("Total Return")).toBeInTheDocument();
    expect(screen.getByText("Annual Yield")).toBeInTheDocument();
    expect(screen.getByText("Risk Score")).toBeInTheDocument();
    expect(screen.getByText("Sharpe Ratio")).toBeInTheDocument();
  });

  test("displays performance analysis section", () => {
    render(<Analytics />);
    expect(screen.getByText("Performance Analysis")).toBeInTheDocument();
  });

  test("displays asset allocation section", () => {
    render(<Analytics />);
    expect(screen.getByText("Asset Allocation")).toBeInTheDocument();
  });

  test("displays geographic distribution section", () => {
    render(<Analytics />);
    expect(screen.getByText("Geographic Distribution")).toBeInTheDocument();
  });

  test("displays risk analysis section", () => {
    render(<Analytics />);
    expect(screen.getByText("Risk Analysis")).toBeInTheDocument();
  });
});
