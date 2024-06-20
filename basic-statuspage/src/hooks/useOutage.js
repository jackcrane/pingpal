import React, { useEffect, useState } from "react";
import { url } from "../lib/url";

const useOutage = ({
  serviceId,
  includeFailures,
  outageId,
  includeComments,
}) => {
  const [outage, setOutage] = useState(null);
  const [sortedFailures, setSortedFailures] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOutage = async () => {
    if (!outageId) return;
    if (!serviceId) return;
    if (!window.workspaceId) return;

    setLoading(true);
    const f = await fetch(
      url(
        `/workspaces/${
          window.workspaceId
        }/${serviceId}/outages/${outageId}?includeFailures=${
          includeFailures ? "true" : "false"
        }&includeComments=${includeComments ? "true" : "false"}`
      )
    );
    const data = await f.json();
    setOutage(data);
    if (includeFailures)
      setSortedFailures(combineSequentialFailures(data?.failures));
    setLoading(false);
  };

  function combineSequentialFailures(failures) {
    console.log("Combin");
    if (failures.length === 0) return [];

    const sortedFailures = [];
    let currentGroup = {
      start: failures[0].createdAt,
      end: failures[0].createdAt,
      reason: failures[0].reason,
      failures: [failures[0].id],
    };

    for (let i = 1; i < failures.length; i++) {
      const failure = failures[i];

      if (failure.reason === currentGroup.reason) {
        currentGroup.end = failure.createdAt;
        currentGroup.failures.push(failure.id);
      } else {
        sortedFailures.push(currentGroup);
        currentGroup = {
          start: failure.createdAt,
          end: failure.createdAt,
          reason: failure.reason,
          failures: [failure.id],
        };
      }
    }

    // Push the last group
    sortedFailures.push(currentGroup);

    return sortedFailures;
  }

  useEffect(() => {
    fetchOutage();
  }, []);

  return { outage, sortedFailures, loading, refetch: fetchOutage };
};

export default useOutage;
