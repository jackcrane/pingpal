import React, { useState, useEffect } from "react";
import { AuthFetch } from "../lib/url";

export const useWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorkspaces = async () => {
    const response = await AuthFetch("/dashboard/workspaces");
    const data = await response.json();
    if (!response.ok) {
      setError(data);
      return;
    }
    setWorkspaces(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  return { workspaces, loading, error, refetch: fetchWorkspaces };
};
