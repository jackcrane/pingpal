import React, { useState, useEffect } from "react";
import { AuthFetch } from "../lib/url";

export const useAuth = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const f = await AuthFetch("/auth/me");
      const u = await f.json();
      setUser(u);
      setLoading(false);
    })();
  }, []);

  return { loading, user };
};
