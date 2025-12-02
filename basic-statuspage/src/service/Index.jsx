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
  Green,
  Red,
  Yellow,
  Orange,
} from "./Kit";
import useService from "../hooks/useService";
import { Between, Column, H3, H4, P, Relative, Row, Spacer } from "../kit";
import { LatencyChart } from "../lib/LatencyChart";
import { useTheme } from "styled-components";
import {
  ArrowFatUp,
  ArrowLeft,
  ArrowRight,
  CaretUpDown,
  ArrowSquareRight,
  SquareHalf,
  ThumbsUp,
  WarningDiamond,
  CaretDown,
} from "@phosphor-icons/react";
import { Inspect } from "./Inspect";
import { PillHoverHostController } from "./PillHoverHostController";
import useServiceOutages from "../hooks/useServiceOutages";
import moment from "moment";
import Outage from "./outage/Index";
import { useFavicon } from "@uidotdev/usehooks";
import { Tooltip } from "./outage/Kit";

export const Service = ({ serviceId, workspaceId, fullscreen = false }) => {
  let globalTimeout = null;
  const effectiveWorkspaceId = workspaceId ?? window.workspaceId;
  const { loading, service } = useService(serviceId, effectiveWorkspaceId);
  const { currentlyActive, outages } = useServiceOutages(serviceId);

  const [hovBucket, setHovBucket] = useState(null);
  const [currentBucketIndex, setCurrentBucketIndex] = useState(0);
  const hasData = service?.data && service.data.length > 0;
  const hasBuckets = hasData && service.data.some((d) => d.total > 0);
  const targetPillCount = fullscreen ? 100 : 60;
  const padOffset = Math.max(0, targetPillCount - (service?.data?.length || 0));
  const placeholderHeights = Array.from({ length: targetPillCount }).map(
    (_, i) => 14 + ((i * 19) % (fullscreen ? 75 : 40))
  );
  const displayData = hasBuckets
    ? service.data.map((d, i) => ({
        ...d,
        _displayBucket: padOffset + i + 1,
        _originalIndex: i,
      }))
    : [];
  const dummyChartData = Array.from({ length: targetPillCount }).map(
    (_, i) => ({
      bucket: i + 1,
      min_latency: 1,
      max_latency: 1,
      median_latency: 1,
      q1_latency: 1,
      q3_latency: 1,
      avg_latency: 1,
      success_percentage: 100,
      starting_time: new Date(Date.now() - (targetPillCount - i) * 60000),
      ending_time: new Date(Date.now() - (targetPillCount - i - 1) * 60000),
      total: 1,
    })
  );
  const chartData = hasBuckets
    ? [
        ...Array.from({ length: padOffset }).map((_, i) => ({
          ...dummyChartData[i],
        })),
        ...displayData.map((d) => ({ ...d, bucket: d._displayBucket })),
      ]
    : dummyChartData;

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
            <Title>{service.service.name}</Title>
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
              <div style={{ opacity: hasBuckets ? 1 : 0, transition: "opacity 0.2s" }}>
                <LatencyChart data={chartData} serviceId={serviceId} />
              </div>
            ) : null}
            <PillRow>
              {(() => {
                const pills = hasBuckets
                  ? [
                      ...Array.from({ length: padOffset }).fill(null),
                      ...displayData,
                    ]
                  : Array.from({ length: targetPillCount }).fill(null);
                return pills.slice(0, targetPillCount).map((d, index) => {
                  if (d) {
                    return (
                      <StatusPill
                        key={d._displayBucket || d.bucket}
                        bucketNumber={d._displayBucket || d.bucket}
                        uptime={d.success_percentage}
                        fullscreen={fullscreen}
                        labelText={moment(d.ending_time).format("M/D") + " ↓"}
                        showLabel={
                          index > 0
                            ? moment(d.ending_time)
                                .startOf("day")
                                .diff(
                                  moment(
                                    (service.data[d._originalIndex - 1] ||
                                      d).ending_time
                                  ).startOf("day")
                                ) !== 0 && moment(d.ending_time).date() % 2 === 0
                            : false
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
                  const height = placeholderHeights[index % placeholderHeights.length];
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
                        {moment(outages[0].createdAt).fromNow()}. The team has
                        been notified!
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
              {outages?.map((outage) => (
                <Outage
                  key={outage.id}
                  outageId={outage.id}
                  serviceId={serviceId}
                  workspaceId={workspaceId}
                />
              ))}
            </>
          ) : (
            <>
              {currentlyActive ? (
                <OutageCard style={{ padding: 2, fontSize: "0.8rem" }}>
                  <Row style={{ gap: 6 }}>
                    <WarningDiamond
                      size={16}
                      color={theme.danger}
                      weight="bold"
                    />
                    <P>Outage since {moment(outages[0].createdAt).fromNow()}</P>
                  </Row>
                </OutageCard>
              ) : (
                <></>
              )}
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
