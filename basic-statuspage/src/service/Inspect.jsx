import React from "react";
import {
  Blue,
  DownTrend,
  FailureLink,
  Green,
  Kbd,
  Li,
  Red,
  S,
  Ul,
  UpTrend,
  ValueBlock,
} from "./Kit";
import { Between, Column, H4, P, Row } from "../kit";
import moment from "moment";
import { ArrowFatUp, Smiley, WarningDiamond } from "@phosphor-icons/react";
import { useTheme } from "styled-components";

export const Inspect = ({ bucket, averages }) => {
  const theme = useTheme();

  return (
    <Column gap={"8px"}>
      <H4>Bucket info</H4>
      <Between>
        <P>Bucket Number</P>
        <i>{bucket.bucket}</i>
      </Between>
      <Between>
        <P>Start time</P>
        <i>{moment(bucket.starting_time).format("M/D, h:mm:ss a")}</i>
      </Between>
      <Between>
        <P>End time</P>
        <i>{moment(bucket.ending_time).format("M/D, h:mm:ss a")}</i>
      </Between>
      <Between>
        <P>Elapsed Time</P>
        <i>
          {/* Days, Hours, Minutes */}
          {(() => {
            let diff = moment(bucket.ending_time).diff(
              moment(bucket.starting_time)
            );
            let duration = moment.duration(diff);
            const days = duration.days() > 0 ? `${duration.days()}d ` : "";
            const hours = duration.hours() > 0 ? `${duration.hours()}h ` : "";
            const minutes =
              duration.minutes() > 0 ? `${duration.minutes()}m` : "";
            return `${days}${hours}${minutes}`;
          })()}
        </i>
      </Between>
      <H4>Uptime</H4>
      <Between>
        <P>Bucket Uptime</P>
        <span>
          [<Red>{bucket.failure_count}</Red>/
          <Green>{bucket.success_count}</Green>/<Blue>{bucket.total}</Blue>]{" "}
          <i>{bucket.success_percentage.toFixed(0)}%</i>
        </span>
      </Between>
      <H4>Latency</H4>
      <Between>
        <P>Average</P>
        <span>
          {bucket.avg_latency > averages.avg_avg_latency ? (
            <UpTrend />
          ) : (
            <DownTrend />
          )}
          <ValueBlock>
            <i>{bucket.avg_latency.toFixed(0)}ms</i>
          </ValueBlock>
        </span>
      </Between>
      <Between>
        <P>Max</P>
        <span>
          {bucket.max_latency > averages.avg_max_latency ? (
            <UpTrend />
          ) : (
            <DownTrend />
          )}
          <ValueBlock>
            <i>{bucket.max_latency.toFixed(0)}ms</i>
          </ValueBlock>
        </span>
      </Between>
      <Between>
        <P>Q3</P>
        <span>
          {bucket.q3_latency > averages.avg_q3_latency ? (
            <UpTrend />
          ) : (
            <DownTrend />
          )}
          <ValueBlock>
            <i>{bucket.q3_latency.toFixed(0)}ms</i>
          </ValueBlock>
        </span>
      </Between>
      <Between>
        <P>Median</P>
        <span>
          {bucket.median_latency > averages.avg_median_latency ? (
            <UpTrend />
          ) : (
            <DownTrend />
          )}
          <ValueBlock>
            <i>{bucket.median_latency.toFixed(0)}ms</i>
          </ValueBlock>
        </span>
      </Between>
      <Between>
        <P>Q1</P>
        <span>
          {bucket.q1_latency > averages.avg_q1_latency ? (
            <UpTrend />
          ) : (
            <DownTrend />
          )}
          <ValueBlock>
            <i>{bucket.q1_latency.toFixed(0)}ms</i>
          </ValueBlock>
        </span>
      </Between>
      <Between>
        <P>Min</P>
        <span>
          {bucket.min_latency > averages.avg_min_latency ? (
            <UpTrend />
          ) : (
            <DownTrend />
          )}
          <ValueBlock>
            <i>{bucket.min_latency.toFixed(0)}ms</i>
          </ValueBlock>
        </span>
      </Between>
      <Row>
        <UpTrend />
        <S>Higher than average</S>
      </Row>
      <Row>
        <DownTrend />
        <S>Lower than average</S>
      </Row>
      <H4>Failures</H4>
      {bucket.failure_count > 0 ? (
        <>
          <Ul>
            {bucket.failure_details.map((f) => (
              <Li key={f.id}>
                <P style={{ display: "inline" }}>
                  {moment(f.timestamp).format("M/D, h:mm:ss a")}
                </P>
              </Li>
            ))}
          </Ul>
        </>
      ) : (
        <Row style={{ gap: 4 }}>
          <P>No failures</P>
          <Smiley />
        </Row>
      )}
    </Column>
  );
};
