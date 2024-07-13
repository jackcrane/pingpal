import React, { useState, useEffect } from "react";
import { AuthFetch } from "../lib/url";

export const useWorkspace = (workspaceId, includeServices = false) => {
  const [workspace, setWorkspace] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorkspace = async () => {
    const response = await AuthFetch(
      `/dashboard/workspaces/${workspaceId}?includeServices=${includeServices}`
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data);
      return;
    }
    setWorkspace(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkspace();
  }, []);

  const requestBillingPortal = async () => {
    const response = await AuthFetch(
      `/dashboard/workspaces/${workspaceId}/checkout`
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data);
      return;
    }
    window.location.href = data.url;
  };

  return {
    workspace,
    loading,
    error,
    refetch: fetchWorkspace,
    requestBillingPortal,
  };
};
