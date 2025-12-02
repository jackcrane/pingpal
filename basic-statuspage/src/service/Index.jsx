import React, { useEffect, useState } from "react";
import {
  Container,
  NoOverflow,
  PillRow,
  ServicePageContainer,
  StatusPill,
  Subtitle,
  Title,
  TitleSkeleton,
  GraphsContainer,
  InspectorContainer,
  BucketSelectorButton,
  Kbd,
  OutageCard,
  WorkingCard,
  EmptyOutageCard,
  Green,
  Red,
  Yellow,
  Orange,
} from "./Kit";
import useService from "../hooks/useService";
import { Between, Column, H3, H4, P, Relative, Row, Spacer } from "../kit";
import { LatencyChart } from "../lib/LatencyChart";
import styled, { useTheme } from "styled-components";
import {
  ArrowFatUp,
  ArrowLeft,
  ArrowRight,
  CaretUpDown,
  ArrowSquareRight,
  SquareHalf,
  ClipboardText,
  ThumbsUp,
  WarningDiamond,
  CaretDown,
} from "@phosphor-icons/react";
import { Inspect } from "./Inspect";
import { PillHoverHostController } from "./PillHoverHostController";
import moment from "moment";
import Outage from "./outage/Index";
import { useFavicon } from "@uidotdev/usehooks";
import { Tooltip } from "./outage/Kit";

const TIME_RANGE_OPTIONS = [
  { label: "30 Days", value: "30d" },
  { label: "7 Days", value: "7d" },
  { label: "24 Hours", value: "24h" },
  { label: "6 Hours", value: "6h" },
  { label: "3 Hours", value: "3h" },
];

const SCALE_MODE_OPTIONS = [
  { label: "Scaled", value: "scaled" },
  { label: "Absolute", value: "absolute" },
  { label: "Absolute Log", value: "absolute-log" },
];

const TimeRangeSelect = styled.select`
  font-size: 0.85rem;
  padding: 4px 28px 4px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border};
  background-color: ${({ theme }) => theme.hover};
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  appearance: none;
  background-image: linear-gradient(
      45deg,
      transparent 50%,
      ${({ theme }) => theme.text} 50%
    ),
    linear-gradient(135deg, ${({ theme }) => theme.text} 50%, transparent 50%);
  background-position: calc(100% - 16px) calc(50% - 2px),
    calc(100% - 10px) calc(50% - 2px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
  transition: background-color 0.2s, border-color 0.2s;
  &:hover {
    background-color: ${({ theme }) => theme.card};
  }
  &:focus {
    outline: none;
    box-shadow: none;
  }
  option {
    background-color: ${({ theme }) => theme.card};
    color: ${({ theme }) => theme.text};
  }
`;

const ChartScaleSelect = styled(TimeRangeSelect)`
  min-width: 140px;
`;

const DEFAULT_TIME_RANGE = "24h";

export const Service = ({ serviceId, workspaceId, fullscreen = false }) => {
  let globalTimeout = null;
  const effectiveWorkspaceId = workspaceId ?? window.workspaceId;
  const [timeRange, setTimeRange] = useState(DEFAULT_TIME_RANGE);
  const [scaleMode, setScaleMode] = useState("scaled");
  const { loading, service } = useService(serviceId, effectiveWorkspaceId, {
    interval: timeRange,
  });
  const outages = service?.outages || [];
  const activeOutage = outages.find((outage) => outage.status === "OPEN");
  const currentlyActive = Boolean(activeOutage);

  const [hovBucket, setHovBucket] = useState(null);
  const [currentBucketIndex, setCurrentBucketIndex] = useState(0);
  const hasData = service?.data && service.data.length > 0;
  const hasBuckets = hasData && service.data.some((d) => d.total > 0);
  const targetPillCount = fullscreen ? 100 : 60;
  const totalBuckets = service?.meta?.bucketCount || targetPillCount;
  const bucketWindow = Math.min(targetPillCount, totalBuckets);
  const bucketDurationMs =
    service?.meta?.intervalMs && service?.meta?.bucketCount
      ? service.meta.intervalMs / service.meta.bucketCount
      : 60 * 1000;
  const generatedAtMs = service?.meta?.generatedAt
    ? new Date(service.meta.generatedAt).getTime()
    : Date.now();
  const intervalMs =
    service?.meta?.intervalMs || bucketWindow * bucketDurationMs;
  const windowStartBucket = Math.max(1, totalBuckets - bucketWindow + 1);
  const rangeStartMs = generatedAtMs - intervalMs;
  const realBuckets = hasBuckets
    ? service.data.map((d, i) => ({ ...d, _originalIndex: i }))
    : [];
  const bucketByNumber = new Map(realBuckets.map((d) => [d.bucket, d]));
  const chartData = Array.from({ length: bucketWindow }).map((_, idx) => {
    const bucketNumber = windowStartBucket + idx;
    const match = bucketByNumber.get(bucketNumber);
    const bucketStart = rangeStartMs + (bucketNumber - 1) * bucketDurationMs;
    const bucketEnd = bucketStart + bucketDurationMs;

    if (match) {
      return {
        ...match,
        bucket: idx + 1,
        _originalBucket: bucketNumber,
        hidden: false,
      };
    }

    return {
      bucket: idx + 1,
      _originalBucket: bucketNumber,
      min_latency: 1,
      max_latency: 1,
      median_latency: 1,
      q1_latency: 1,
      q3_latency: 1,
      avg_latency: 1,
      success_percentage: 0,
      starting_time: new Date(bucketStart).toISOString(),
      ending_time: new Date(bucketEnd).toISOString(),
      total: 0,
      hidden: true,
    };
  });
  const placeholderHeights = Array.from({ length: bucketWindow }).map(
    (_, i) => 14 + ((i * 19) % (fullscreen ? 75 : 40))
  );

  useFavicon(
    fullscreen
      ? currentlyActive
        ? "/assets/logo-red.png"
        : "/assets/logo-green.png"
      : "/assets/logo-blue.png"
  );

  const theme = useTheme();

  useEffect(() => {
    if (service?.data?.length > 0) {
      const safeIndex = Math.min(
        Math.max(currentBucketIndex, 0),
        service.data.length - 1
      );
      setHovBucket(service.data[safeIndex]);
    }
  }, [service, currentBucketIndex]);

  useEffect(() => {
    setCurrentBucketIndex(0);
  }, [timeRange]);

  const handleLeftArrowClick = () => {
    if (!service?.data?.length) return;
    setCurrentBucketIndex((prevIndex) =>
      prevIndex > 0 ? prevIndex - 1 : service.data.length - 1
    );
  };

  const handleRightArrowClick = () => {
    if (!service?.data?.length) return;
    setCurrentBucketIndex((prevIndex) =>
      prevIndex < service.data.length - 1 ? prevIndex + 1 : 0
    );
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const handleScaleModeChange = (event) => {
    setScaleMode(event.target.value);
  };

  if (loading) {
    return (
      <Container fullscreen={fullscreen}>
        <TitleSkeleton />
      </Container>
    );
  }

  if (!service?.service) {
    return (
      <Container fullscreen={fullscreen}>
        <ServicePageContainer
          style={{
            alignItems: "flex-start",
            gap: 10,
            borderTopWidth: 1,
            borderTopStyle: fullscreen ? "solid" : "none",
            borderTopColor: theme.border,
            justifyContent: "space-between",
          }}
        >
          <P>Unable to load service data.</P>
        </ServicePageContainer>
      </Container>
    );
  }

  return (
    <Container id={serviceId} fullscreen={fullscreen}>
      <ServicePageContainer
        style={{
          alignItems: "flex-start",
          gap: 10,
          borderTopWidth: 1,
          borderTopStyle: fullscreen ? "solid" : "none",
          borderTopColor: theme.border,
          justifyContent: "space-between",
        }}
      >
        <GraphsContainer fullscreen={fullscreen}>
          <Between>
            <Row
              style={{
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Title
                style={{
                  margin: 0,
                  height: "auto",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {service.service.name}
              </Title>
              {fullscreen && (
                <Row style={{ gap: 8, flexWrap: "wrap" }}>
                  <TimeRangeSelect
                    value={timeRange}
                    onChange={handleTimeRangeChange}
                  >
                    {TIME_RANGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </TimeRangeSelect>
                  <ChartScaleSelect
                    value={scaleMode}
                    onChange={handleScaleModeChange}
                  >
                    {SCALE_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </ChartScaleSelect>
                </Row>
              )}
            </Row>
            <Subtitle>
              {service.success_percentage != null
                ? `${service.success_percentage.toFixed(2)}%`
                : "No data yet"}
            </Subtitle>
          </Between>
          <Spacer height={"5px"} />
          {fullscreen ? (
            <Row style={{ justifyContent: "flex-end" }}>
              <WarningDiamond size={16} color={theme.warning} weight="bold" />{" "}
              Hold{" "}
              <Kbd>
                <ArrowFatUp size={12} color={theme.subtext} weight="bold" />
                Shift
              </Kbd>{" "}
              to disable select-on-hover.
            </Row>
          ) : (
            <></>
          )}
          <Spacer height={"10px"} />
          <NoOverflow>
            {fullscreen ? (
              <div
                style={{
                  opacity: hasBuckets ? 1 : 0,
                  transition: "opacity 0.2s",
                }}
              >
                <LatencyChart
                  data={chartData}
                  bucketCount={bucketWindow}
                  serviceId={serviceId}
                  averagedData={service.averaged_data}
                  scaleMode={scaleMode}
                />
              </div>
            ) : null}
            <PillRow data-chartdata={JSON.stringify(chartData[0])}>
              {(() => {
                const pills = chartData;
                return pills.slice(0, bucketWindow).map((d, index) => {
                  if (d && !d.hidden) {
                    return (
                      <StatusPill
                        key={d._originalBucket || d.bucket}
                        bucketNumber={d.bucket}
                        uptime={d.success_percentage}
                        fullscreen={fullscreen}
                        labelText={moment(d.ending_time).format("M/D") + " ↓"}
                        showLabel={
                          index > 0
                            ? moment(d.ending_time)
                                .startOf("day")
                                .diff(
                                  moment(
                                    (service.data[d._originalIndex - 1] || d)
                                      .ending_time
                                  ).startOf("day")
                                ) !== 0 &&
                              moment(d.ending_time).date() % 2 === 0
                            : false
                        }
                        isFiller={
                          d.success_count === 0 &&
                          d.failure_count === 0 &&
                          d.total === 0
                        }
                      >
                        {fullscreen ? (
                          <PillHoverHostController
                            bucket={d}
                            activeBucket={hovBucket}
                            index={d._originalIndex}
                            currentBucketIndex={currentBucketIndex}
                            setCurrentBucketIndex={setCurrentBucketIndex}
                          />
                        ) : null}
                      </StatusPill>
                    );
                  }
                  const height =
                    placeholderHeights[index % placeholderHeights.length];
                  return (
                    <div
                      key={`placeholder-${index}`}
                      style={{
                        height: Math.max(8, height),
                        width: fullscreen ? 10 : 4,
                        marginRight: fullscreen ? 5 : 3,
                        backgroundColor: "transparent",
                        borderRadius: 12,
                        opacity: 0,
                        border: `1px solid transparent`,
                        visibility: "hidden",
                      }}
                    />
                  );
                });
              })()}
            </PillRow>
            {fullscreen && hasBuckets && (
              <>
                <Spacer height="65px" />
                <Row style={{ gap: 10 }}>
                  <Green>
                    <Row>
                      <CaretUpDown
                        size={16}
                        color={theme.success}
                        weight="bold"
                      />{" "}
                      100%
                    </Row>
                  </Green>
                  <Yellow>
                    <Row>
                      <CaretUpDown
                        size={16}
                        color={theme.warning}
                        weight="bold"
                      />{" "}
                      (70% - 100%)
                    </Row>
                  </Yellow>
                  <Orange>
                    <Row>
                      <CaretUpDown
                        size={16}
                        color={theme.badnews}
                        weight="bold"
                      />{" "}
                      (10% - 70%]
                    </Row>
                  </Orange>
                  <Red>
                    <Row>
                      <CaretUpDown
                        size={16}
                        color={theme.danger}
                        weight="bold"
                      />{" "}
                      [0% - 10%]
                    </Row>
                  </Red>
                  <Tooltip
                    text={"Interval notation"}
                    message={
                      "Brackets are inclusive, parenthesis are exclusive. (10-70] does not include 10, but includes 70."
                    }
                  />
                </Row>
              </>
            )}
            <Spacer />
          </NoOverflow>

          {!hasData && (
            <>
              <Spacer />
              <P>No datapoints recorded yet for this service.</P>
            </>
          )}

          {fullscreen ? (
            <>
              <Spacer />
              {currentlyActive ? (
                <OutageCard>
                  <Row style={{ gap: 10 }}>
                    <WarningDiamond
                      size={32}
                      color={theme.danger}
                      weight="bold"
                    />
                    <Column>
                      <H4>Current outage</H4>
                      <P>
                        {service.service.name} is currently experiencing an
                        outage, starting{" "}
                        {activeOutage &&
                          moment(activeOutage.createdAt).fromNow()}
                        . The team has been notified!
                      </P>
                    </Column>
                  </Row>
                </OutageCard>
              ) : (
                <WorkingCard>
                  <Row style={{ gap: 10 }}>
                    <ThumbsUp size={32} color={theme.success} weight="bold" />
                    <Column>
                      <H4>Everything is working fine</H4>
                      <P>
                        {service.service.name} is working fine at the moment.
                      </P>
                    </Column>
                  </Row>
                </WorkingCard>
              )}
              <Spacer />
              <H3>Outages</H3>
              <Spacer />
              {outages?.length ? (
                outages.map((outage) => (
                  <Outage
                    key={outage.id}
                    outage={outage}
                    serviceId={serviceId}
                  />
                ))
              ) : (
                <EmptyOutageCard>
                  <Row style={{ gap: 10 }}>
                    <ClipboardText
                      size={32}
                      color={theme.subtext}
                      weight="bold"
                    />
                    <Column>
                      <H4>No outages recorded</H4>
                      <P>
                        We haven't logged any outages for this service in this
                        time range.
                      </P>
                    </Column>
                  </Row>
                </EmptyOutageCard>
              )}
            </>
          ) : (
            <>
              {currentlyActive && activeOutage ? (
                <OutageCard style={{ padding: 2, fontSize: "0.8rem" }}>
                  <Row style={{ gap: 6 }}>
                    <WarningDiamond
                      size={16}
                      color={theme.danger}
                      weight="bold"
                    />
                    <P>
                      Outage since {moment(activeOutage.createdAt).fromNow()}
                    </P>
                  </Row>
                </OutageCard>
              ) : null}
            </>
          )}
        </GraphsContainer>
        {fullscreen && (
          <InspectorContainer>
            <Spacer height="20px" />
            <Row style={{ gap: 5 }}>
              <H3>Bucket Statistics {"   "}</H3>
              <BucketSelectorButton left onClick={handleLeftArrowClick}>
                <ArrowLeft size={32} color={theme.text} />
              </BucketSelectorButton>
              <BucketSelectorButton onClick={handleRightArrowClick}>
                <ArrowRight size={32} color={theme.text} />
              </BucketSelectorButton>
            </Row>
            <Spacer height="10px" />
            {hovBucket ? (
              <Inspect bucket={hovBucket} averages={service.averaged_data} />
            ) : (
              <div>
                <p>Hover over a spot on the graph for more information</p>
                <Spacer />
              </div>
            )}
          </InspectorContainer>
        )}
      </ServicePageContainer>
    </Container>
  );
};
