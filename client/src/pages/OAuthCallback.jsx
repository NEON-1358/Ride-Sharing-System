import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { acceptExternalToken } = useAuth();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    acceptExternalToken(token).then(() => navigate("/dashboard", { replace: true }));
  }, [acceptExternalToken, navigate]);

  return <div className="page-shell"><div className="panel">Completing Google login...</div></div>;
}
