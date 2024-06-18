import React, { useEffect, useState } from "react";
import { url } from "../lib/url";

const useService = (serviceId) => {
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchService = async () => {
    setLoading(true);
    const f = await fetch(
      url(
        `/workspaces/${window.workspaceId}/${serviceId}?interval=30d&bucketCount=100`
      )
    );
    const data = await f.json();
    setService(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchService();
  }, []);

  return { service, loading, refetch: fetchService };
};

export default useService;
