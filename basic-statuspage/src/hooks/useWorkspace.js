import React, { useEffect, useState } from "react";
import { url } from "../lib/url";

const useWorkspace = (workspaceId) => {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspace = async () => {
    setLoading(true);
    const f = await fetch(url(`/workspaces/${workspaceId}`));
    const data = await f.json();
    setWorkspace(data);
    setLoading(false);
  };

  useEffect(() => {
    window.workspaceId = workspaceId;
    fetchWorkspace();
  }, []);

  return { workspace, loading, refetch: fetchWorkspace };
};

export default useWorkspace;
