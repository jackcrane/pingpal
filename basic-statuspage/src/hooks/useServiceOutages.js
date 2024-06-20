import React, { useEffect, useState } from "react";
import { url } from "../lib/url";

const useServiceOutages = (serviceId) => {
  const [outages, setOutages] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOutages = async () => {
    setLoading(true);
    const f = await fetch(
      url(
        `/workspaces/${window.workspaceId}/${serviceId}/outages?includeClosed=true`
      )
    );
    const data = await f.json();
    setOutages(data);
    setLoading(false);

    console.log(data);
  };

  useEffect(() => {
    fetchOutages();
  }, []);

  return {
    outages,
    loading,
    refetch: fetchOutages,
    currentlyActive:
      outages?.filter((outage) => outage.status === "OPEN").length > 0,
  };
};

export default useServiceOutages;
