import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authAPI } from "../services/api";
import { getErrorMessage, showToast, storage } from "../utils/helpers";

export const AuthContext = createContext(undefined);

const TOKEN_KEY = "qv_access_token";
const REFRESH_KEY = "qv_refresh_token";
const USER_KEY = "qv_user";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => storage.get(USER_KEY, null));
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY)),
  );
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback((data) => {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    storage.set(USER_KEY, data.user);
    setUser(data.user);
    setIsAuthenticated(true);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // On mount: if we have a token, verify it against /auth/profile so stale
  // or expired sessions don't silently render protected pages.
  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authAPI.getProfile();
        if (data.success) {
          storage.set(USER_KEY, data.user);
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          clearSession();
        }
      } catch (error) {
        // Interceptor will have already tried a refresh; if we land here
        // the session is genuinely gone.
        clearSession();
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [clearSession]);

  // Backend/interceptor tells us the refresh token is dead too.
  useEffect(() => {
    const handleExpired = () => {
      clearSession();
      showToast("Your session has expired. Please sign in again.", "warning");
    };
    window.addEventListener("qv-session-expired", handleExpired);
    return () =>
      window.removeEventListener("qv-session-expired", handleExpired);
  }, [clearSession]);

  const login = useCallback(
    async ({ identifier, password }) => {
      try {
        const { data } = await authAPI.login({
          username: identifier,
          email: identifier,
          password,
        });
        if (!data.success) {
          return { success: false, error: data.error || "Invalid credentials" };
        }
        persistSession(data);
        return { success: true, user: data.user };
      } catch (error) {
        return {
          success: false,
          error: getErrorMessage(error, "Unable to sign in right now."),
        };
      }
    },
    [persistSession],
  );

  const register = useCallback(
    async (payload) => {
      try {
        const { data } = await authAPI.register(payload);
        if (!data.success) {
          return { success: false, error: data.error || "Registration failed" };
        }
        persistSession(data);
        return { success: true, user: data.user };
      } catch (error) {
        return {
          success: false,
          error: getErrorMessage(
            error,
            "Unable to create your account right now.",
          ),
        };
      }
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    try {
      if (localStorage.getItem(TOKEN_KEY)) {
        await authAPI.logout();
      }
    } catch (error) {
      // Best-effort — clear the local session regardless of server response.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const updateProfile = useCallback(async (patch) => {
    try {
      const { data } = await authAPI.updateProfile(patch);
      if (!data.success) {
        return {
          success: false,
          error: data.error || "Could not update profile",
        };
      }
      storage.set(USER_KEY, data.user);
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Could not update profile."),
      };
    }
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      const { data } = await authAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      if (!data.success) {
        return {
          success: false,
          error: data.error || "Could not change password",
        };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Could not change password."),
      };
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      loading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    }),
    [
      user,
      isAuthenticated,
      loading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
