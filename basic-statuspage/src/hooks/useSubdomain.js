import React, { useEffect, useState } from "react";
import { url } from "../lib/url";

const useSubdomain = (subdomainId) => {
  const [subdomain, setsubdomain] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchsubdomain = async () => {
    const _subdomain = new URL(window.location.href).hostname.split(".")[0];
    setLoading(true);
    const f = await fetch(url(`/workspaces?subdomain=${_subdomain}`));
    const data = await f.json();
    setsubdomain(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchsubdomain();
  }, []);

  return { workspaceId: subdomain?.id, loading, refetch: fetchsubdomain };
};

export default useSubdomain;
