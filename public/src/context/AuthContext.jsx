import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getMe, getToken, login as apiLogin, setToken, signup as apiSignup } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(Boolean(getToken()));

  async function refreshUser() {
    const existingToken = getToken();
    if (!existingToken) {
      setUser(null);
      setReviews([]);
      setLoading(false);
      return null;
    }

    setLoading(true);
    try {
      const response = await getMe();
      setUser(response.user);
      setReviews(response.reviews || []);
      return response.user;
    } catch (_error) {
      clearToken();
      setTokenState("");
      setUser(null);
      setReviews([]);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshUser();
  }, []);

  async function login(credentials) {
    const response = await apiLogin(credentials);
    setToken(response.token);
    setTokenState(response.token);
    await refreshUser();
    return response;
  }

  async function signup(formData) {
    const response = await apiSignup(formData);
    setToken(response.token);
    setTokenState(response.token);
    await refreshUser();
    return response;
  }

  function acceptExternalToken(nextToken) {
    setToken(nextToken);
    setTokenState(nextToken);
    return refreshUser();
  }

  function logout() {
    clearToken();
    setTokenState("");
    setUser(null);
    setReviews([]);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      reviews,
      loading,
      isAuthenticated: Boolean(user && token),
      login,
      logout,
      signup,
      refreshUser,
      acceptExternalToken,
    }),
    [token, user, reviews, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
