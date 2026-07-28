import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../../contexts/AuthContext";
import { authAPI } from "../../services/api";

jest.mock("../../services/api", () => ({
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
  },
}));

const mockUser = {
  id: "1",
  username: "janedoe",
  email: "jane@example.com",
  first_name: "Jane",
};

const Probe = () => {
  const { user, isAuthenticated, loading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="username">{user?.username || ""}</span>
      <button
        onClick={() => login({ identifier: "janedoe", password: "secret123" })}
      >
        login
      </button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
};

const renderWithProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

describe("AuthContext", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  test("starts unauthenticated with no stored token", async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );
    expect(screen.getByTestId("authed").textContent).toBe("false");
  });

  test("login() stores tokens and updates state on success", async () => {
    authAPI.login.mockResolvedValueOnce({
      data: {
        success: true,
        access_token: "a",
        refresh_token: "r",
        user: mockUser,
      },
    });

    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );

    await act(async () => {
      screen.getByText("login").click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("authed").textContent).toBe("true"),
    );
    expect(screen.getByTestId("username").textContent).toBe("janedoe");
    expect(window.localStorage.getItem("qv_access_token")).toBe("a");
  });

  test("logout() clears the session", async () => {
    authAPI.login.mockResolvedValueOnce({
      data: {
        success: true,
        access_token: "a",
        refresh_token: "r",
        user: mockUser,
      },
    });
    authAPI.logout.mockResolvedValueOnce({ data: { success: true } });

    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );

    await act(async () => {
      screen.getByText("login").click();
    });
    await waitFor(() =>
      expect(screen.getByTestId("authed").textContent).toBe("true"),
    );

    await act(async () => {
      screen.getByText("logout").click();
    });

    await waitFor(() =>
      expect(screen.getByTestId("authed").textContent).toBe("false"),
    );
    expect(window.localStorage.getItem("qv_access_token")).toBeNull();
  });
});
