import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";

const renderSidebar = (props = {}) =>
  render(
    <MemoryRouter>
      <Sidebar isOpen={true} toggleSidebar={() => {}} {...props} />
    </MemoryRouter>,
  );

describe("Sidebar", () => {
  test("renders brand name", () => {
    renderSidebar();
    expect(screen.getByText("QuantumVest")).toBeInTheDocument();
  });

  test("renders navigation links", () => {
    renderSidebar();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Predictions")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });
});
