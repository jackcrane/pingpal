import React, { useEffect, useState } from "react";
import { useTheme } from "styled-components";
import {
  CanvasGroup,
  VictoryBoxPlot,
  VictoryGroup,
  VictoryLine,
  VictoryTheme,
  VictoryTooltip,
} from "victory";
import { useWindowSize } from "@uidotdev/usehooks";

// min, median, max, q1, q3

export const LatencyChart = ({ data, serviceId, bucketCount, averagedData }) => {
  const actualCount = bucketCount || data.length || 0;

  const visibleData = (data || []).filter((d) => !d.hidden);
  const _data = visibleData.map((d) => ({
    x: d.bucket,
    y: [
      d.min_latency,
      d.median_latency,
      d.max_latency,
      d.q1_latency,
      d.q3_latency,
    ],
    label: `${d.avg_latency ?? 0}ms`,
  }));

  const averagedMedianLatency =
    typeof averagedData?.avg_median_latency === "number"
      ? averagedData.avg_median_latency
      : null;
  const fallbackMedianLatency = visibleData.reduce(
    (max, d) => Math.max(max, d?.median_latency ?? 0),
    0
  );
  const medianLatencyBaseline =
    averagedMedianLatency && averagedMedianLatency > 0
      ? averagedMedianLatency
      : fallbackMedianLatency;
  const safeMedianBaseline =
    medianLatencyBaseline && medianLatencyBaseline > 0 ? medianLatencyBaseline : 1;
  const latencyDomainMax = safeMedianBaseline * 2;

  const absoluteMinLatency = visibleData.reduce((min, d) => {
    const value = d?.min_latency;
    if (typeof value !== "number") return min;
    return Math.min(min, value);
  }, Number.POSITIVE_INFINITY);
  const safeMinBaseline = Number.isFinite(absoluteMinLatency)
    ? absoluteMinLatency
    : 0;
  const latencyDomainMin =
    safeMinBaseline > 0 ? Math.max(0, safeMinBaseline * 0.9) : 0;

  const lineData = Array.from({ length: actualCount }).map((_, i) => {
    const bucketNumber = i + 1;
    const match = (data || []).find((d) => d.bucket === bucketNumber);
    if (match && !match.hidden) {
      return { x: bucketNumber, y: match.y ? match.y[1] : match.median_latency };
    }
    return { x: bucketNumber, y: null };
  });

  const [width, setWidth] = useState(0);
  const theme = useTheme();

  const { width: windowWidth } = useWindowSize();

  useEffect(() => {
    setTimeout(() => {
      setWidth(document.getElementById(serviceId)?.offsetWidth);
    }, 1000);
  }, [serviceId]);

  const handleBoxClick = (event, data) => {
    console.log("Box clicked:", data);
    // Add your custom logic here
  };

  const getBoxWidth = () => {
    if (windowWidth > 800) return 8;
    if (windowWidth > 600) return 6;
    if (windowWidth > 400) return 4;
    return 2;
  };

  const getStrokeWidth = () => {
    if (windowWidth > 800) return 2;
    if (windowWidth > 600) return 1.5;
    if (windowWidth > 400) return 1;
    return 0.5;
  };

  return (
    <VictoryGroup
      scale={{ y: "sqrt" }}
      height={windowWidth > 900 ? 500 : 200}
      width={width}
      standalone={true}
      padding={4}
      domain={{
        x: [1, Math.max(actualCount, 1)],
        y: [latencyDomainMin, latencyDomainMax],
      }}
      theme={{
        ...VictoryTheme.material,
        boxplot: {
          style: {
            min: { stroke: theme.success, opacity: 0.8, strokeWidth: 3 },
            max: { stroke: theme.danger, opacity: 0.8, strokeWidth: 3 },
            q1: { fill: theme.okaynews, opacity: 0.8, strokeWidth: 3 },
            q3: { fill: theme.badnews, opacity: 0.8, strokeWidth: 3 },
            median: {
              fill: theme.warning,
              stroke: theme.warning,
              opacity: 0.8,
              strokeWidth: 5,
            },
          },
        },
      }}
    >
      <VictoryBoxPlot
        labelComponent={<VictoryTooltip />}
        width={width}
        height={400}
        data={_data}
        boxWidth={getBoxWidth()}
        strokeWidth={getStrokeWidth()}
        domain={{ y: [latencyDomainMin, latencyDomainMax] }}
        standalone={true}
        groupComponent={<CanvasGroup />}
        events={[
          {
            target: "data",
            eventHandlers: {
              onClick: (event, props) => {
                handleBoxClick(event, props.datum);
                return null; // Returning null means no visual changes on click
              },
            },
          },
        ]}
      />
      <VictoryLine
        data={lineData}
        style={{ data: { stroke: theme.blue } }}
        standalone={true}
      />
    </VictoryGroup>
  );
};
