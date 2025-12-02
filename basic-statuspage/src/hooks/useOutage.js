import { useEffect, useRef, useState } from "react";
import { url } from "../lib/url";

const useOutage = ({ outageId, serviceId, enabled = true }) => {
  const [outage, setOutage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchedKeyRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    if (!outageId || !serviceId) return;
    if (!window.workspaceId) return;

    const key = `${serviceId}-${outageId}`;
    if (fetchedKeyRef.current === key && outage) return;

    let cancelled = false;

    const fetchOutage = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          url(
            `/workspaces/${window.workspaceId}/${serviceId}/outages/${outageId}?includeFailures=true&includeComments=true`
          )
        );
        if (!response.ok) {
          throw new Error(
            `Failed to load outage ${outageId}: ${response.status}`
          );
        }
        const data = await response.json();
        if (!cancelled) {
          fetchedKeyRef.current = key;
          setOutage(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchOutage();

    return () => {
      cancelled = true;
    };
  }, [enabled, outageId, serviceId]);

  return { outage, loading, error };
};

export default useOutage;
