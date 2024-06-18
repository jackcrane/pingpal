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

// min, median, max, q1, q3

export const LatencyChart = ({ data, serviceId }) => {
  const _data = data.map((d) => {
    return {
      x: d.bucket,
      y: [
        d.min_latency,
        d.median_latency,
        d.max_latency,
        d.q1_latency,
        d.q3_latency,
      ],
      label: `${d.avg_latency}ms`,
    };
  });

  const [width, setWidth] = useState(0);
  const theme = useTheme();

  useEffect(() => {
    setTimeout(() => {
      setWidth(document.getElementById(serviceId)?.offsetWidth);
    }, 1000);
  }, [serviceId]);

  return (
    <VictoryGroup
      scale={{ y: "sqrt" }}
      height={200}
      width={width}
      standalone={true}
      padding={1}
      theme={{
        ...VictoryTheme.material,
        boxplot: {
          style: {
            min: { stroke: theme.success, opacity: 0.35 },
            max: { stroke: theme.danger, opacity: 0.35 },
            q1: { fill: theme.warning, opacity: 0.35 },
            q3: { fill: theme.badnews, opacity: 0.35 },
            median: { fill: theme.warning, opacity: 0.35 },
            minLabels: { fill: "tomato" },
            maxLabels: { fill: "tomato" },
            q1Labels: { fill: "tomato" },
            q3Labels: { fill: "tomato" },
            medianLabels: { fill: "tomato" },
          },
        },
      }}
    >
      <VictoryBoxPlot
        labelComponent={<VictoryTooltip />}
        width={width}
        height={200}
        data={_data}
        boxWidth={2}
        domain={{ y: [10, 2000] }}
        standalone={true}
        groupComponent={<CanvasGroup />}
      />
      <VictoryLine
        data={_data.map((d) => ({ x: d.x, y: d.y[1] }))}
        style={{ data: { stroke: theme.success } }}
        standalone={true}
      />
    </VictoryGroup>
  );
};
