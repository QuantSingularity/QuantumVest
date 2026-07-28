import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  authAPI,
  setSessionExpiredHandler,
  AUTH_STORAGE_KEYS,
} from "../services/api";

const AuthContext = createContext(null);
const { TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } = AUTH_STORAGE_KEYS;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearAuthState = useCallback(async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  }, []);

  // Verify the stored session against the backend on launch, so an
  // expired/invalid token doesn't silently render protected screens.
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (!savedToken) {
          setLoading(false);
          return;
        }

        // Optimistically show cached user while we verify in the background.
        if (savedUser) {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
        }

        const { data } = await authAPI.getProfile();
        if (data.success) {
          setUser(data.user);
          setToken(savedToken);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
        } else {
          await clearAuthState();
        }
      } catch (err) {
        await clearAuthState();
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [clearAuthState]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      clearAuthState();
    });
    return () => setSessionExpiredHandler(null);
  }, [clearAuthState]);

  const persistSession = async (data) => {
    setToken(data.access_token);
    setUser(data.user);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, data.access_token],
      [REFRESH_TOKEN_KEY, data.refresh_token],
      [USER_KEY, JSON.stringify(data.user)],
    ]);
  };

  const login = async (identifier, password) => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await authAPI.login({
        username: identifier,
        email: identifier,
        password,
      });

      if (data.success) {
        await persistSession(data);
        return { success: true, user: data.user };
      }
      setError(data.error || "Login failed");
      return { success: false, error: data.error || "Login failed" };
    } catch (err) {
      const message =
        err.response?.data?.error || "Network error. Please try again.";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await authAPI.register(userData);

      if (data.success) {
        await persistSession(data);
        return { success: true, user: data.user };
      }
      setError(data.error || "Registration failed");
      return { success: false, error: data.error || "Registration failed" };
    } catch (err) {
      const message =
        err.response?.data?.error || "Network error. Please try again.";
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) await authAPI.logout();
    } catch (err) {
      // Best-effort — always clear the local session regardless.
    } finally {
      await clearAuthState();
    }
  };

  const updateProfile = async (patch) => {
    try {
      const { data } = await authAPI.updateProfile(patch);
      if (data.success) {
        setUser(data.user);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
      return {
        success: false,
        error: data.error || "Could not update profile",
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || "Could not update profile.",
      };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const { data } = await authAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      if (data.success) return { success: true };
      return {
        success: false,
        error: data.error || "Could not change password",
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || "Could not change password.",
      };
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated: Boolean(user && token),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
