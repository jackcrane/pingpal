import React, { useEffect, useState } from "react";
import { url } from "../lib/url";

const useSubdomain = () => {
  const [workspaceId, setWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspace = async () => {
    setLoading(true);
    const f = await fetch(url(`/workspaces`));
    const data = await f.json();
    setWorkspaceId(data?.id || "default");
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkspace();
  }, []);

  return { workspaceId, loading, refetch: fetchWorkspace };
};

export default useSubdomain;
