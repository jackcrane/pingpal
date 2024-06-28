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
        domain={{ y: [10, 2000] }}
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
        data={_data.map((d) => ({ x: d.x, y: d.y[1] }))}
        style={{ data: { stroke: theme.blue } }}
        standalone={true}
      />
    </VictoryGroup>
  );
};
