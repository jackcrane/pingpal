import React, { useState, useEffect } from "react";
import { AuthFetch } from "../lib/url";

export const useAuth = ({ forceLogin = true }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    document.location.href = "/login";
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const f = await AuthFetch("/auth/me", {
        method: "POST",
      });
      const u = await f.json();
      if (f.status === 401 && forceLogin) {
        document.location.href = "/login";
      }
      if (!u.id) {
        setUser(null);
        setLoading(false);
        if (forceLogin) document.location.href = "/login";
      }

      setUser(u);
      setLoading(false);
    })();
  }, []);

  return { loading, user, logout };
};
