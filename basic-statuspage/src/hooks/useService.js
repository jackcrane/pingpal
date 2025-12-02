import React, { useCallback, useEffect, useState } from "react";
import { url } from "../lib/url";

const useService = (
  serviceId,
  workspaceId,
  { interval = "30d", bucketCount = 100 } = {}
) => {
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchService = useCallback(async () => {
    const targetWorkspaceId = workspaceId ?? window.workspaceId;
    if (!serviceId || !targetWorkspaceId) {
      return;
    }
    setLoading(true);
    try {
      const f = await fetch(
        url(
          `/workspaces/${targetWorkspaceId}/${serviceId}?interval=${interval}&bucketCount=${bucketCount}`
        )
      );
      const data = await f.json();
      setService(data);
    } finally {
      setLoading(false);
    }
  }, [serviceId, workspaceId, interval, bucketCount]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  return { service, loading, refetch: fetchService };
};

export default useService;
