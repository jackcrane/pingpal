import React, { useEffect, useState } from "react";
import {
  Blue,
  Container,
  DownTrend,
  FailureLink,
  Green,
  Li,
  NoOverflow,
  PillHoverHost,
  PillRow,
  Red,
  ServicePageContainer,
  S,
  StatusPill,
  Subtitle,
  Title,
  TitleSkeleton,
  Ul,
  UpTrend,
  ValueBlock,
  GraphsContainer,
  InspectorContainer,
} from "./Service.kit";
import useService from "./hooks/useService";
import { Between, Column, H3, H4, P, Relative, Row, Spacer } from "./kit";
import { LatencyChart } from "./lib/LatencyChart";
import moment from "moment";
import { useTheme } from "styled-components";
import { Smiley, SmileyMelting } from "@phosphor-icons/react";

export const Service = ({ serviceId, fullscreen = false }) => {
  let globalTimeout = null;
  const { loading, service } = useService(serviceId);
  const [hovBucket, setHovBucket] = useState(null);
  const [lockedBucket, setLockedBucket] = useState(null);

  const theme = useTheme();

  if (loading)
    return (
      <Container fullscreen={fullscreen}>
        <TitleSkeleton />
      </Container>
    );

  return (
    <Container id={serviceId} fullscreen={fullscreen}>
      <ServicePageContainer
        style={{
          alignItems: "flex-start",
          gap: 10,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderTopStyle: fullscreen ? "solid" : "none",
          borderBottomStyle: fullscreen ? "solid" : "none",
          borderTopColor: theme.border,
          borderBottomColor: theme.border,
          justifyContent: "space-between",
        }}
      >
        <GraphsContainer fullscreen={fullscreen}>
          <Between>
            <Title>{service.service.name}</Title>
            <Subtitle>{service.success_percentage.toFixed(2)}%</Subtitle>
          </Between>
          <Spacer />
          <NoOverflow>
            {fullscreen ? (
              <LatencyChart data={service.data} serviceId={serviceId} />
            ) : (
              <></>
            )}
            <PillRow>
              {service.data.map((d) => (
                <StatusPill
                  key={d.bucket}
                  uptime={d.success_percentage}
                  fullscreen={fullscreen}
                >
                  {fullscreen ? (
                    <PillHoverHostController
                      bucket={d}
                      setActiveBucket={(d) => setHovBucket(d)}
                      setLockedBucket={(d) => setLockedBucket(d)}
                      lockedBucket={lockedBucket}
                      activeBucket={hovBucket}
                    />
                  ) : null}
                </StatusPill>
              ))}
            </PillRow>
          </NoOverflow>
        </GraphsContainer>
        {fullscreen && (
          <InspectorContainer>
            <Spacer height="20px" />
            <H3>Bucket Statistics</H3>
            <Spacer height="10px" />
            {lockedBucket ? (
              <Inspect bucket={lockedBucket} averages={service.averaged_data} />
            ) : hovBucket ? (
              <Inspect bucket={hovBucket} averages={service.averaged_data} />
            ) : (
              <p>Hover over a spot on the graph for more information</p>
            )}
          </InspectorContainer>
        )}
      </ServicePageContainer>
    </Container>
  );
};

const Inspect = ({ bucket, averages }) => {
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
                <FailureLink to={`failures/${f.id}`}>
                  <P style={{ display: "inline" }}>
                    {moment(f.timestamp).format("M/D, h:mm:ss a")}
                  </P>
                </FailureLink>
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

const PillHoverHostController = ({
  setActiveBucket,
  setLockedBucket,
  bucket,
  lockedBucket,
}) => {
  const [hovered, setHovered] = useState(false);

  const handleHover = (status) => {
    if (!lockedBucket) {
      setHovered(status);
      setActiveBucket(status ? bucket : null);
    }
  };

  const handleClick = () => {
    if (lockedBucket) {
      setLockedBucket(null);
    } else {
      setLockedBucket(bucket);
    }
  };

  return (
    <PillHoverHost
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
      onClick={handleClick}
      hovered={
        hovered || (lockedBucket && lockedBucket.bucket === bucket.bucket)
      }
    >
      {bucket.bucket}
    </PillHoverHost>
  );
};
