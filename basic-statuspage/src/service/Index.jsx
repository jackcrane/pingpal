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
} from "./Kit";
import useService from "../hooks/useService";
import { Between, Column, H3, H4, P, Relative, Row, Spacer } from "../kit";
import { LatencyChart } from "../lib/LatencyChart";
import { useTheme } from "styled-components";
import {
  ArrowFatUp,
  ArrowLeft,
  ArrowRight,
  ArrowSquareLeft,
  ArrowSquareRight,
  SmileyMelting,
  ThumbsUp,
  WarningDiamond,
} from "@phosphor-icons/react";
import { Inspect } from "./Inspect";
import { PillHoverHostController } from "./PillHoverHostController";
import useServiceOutages from "../hooks/useServiceOutages";
import moment from "moment";
import Outage from "./outage/Index";
import { useFavicon } from "@uidotdev/usehooks";

export const Service = ({ serviceId, fullscreen = false }) => {
  let globalTimeout = null;
  const { loading, service } = useService(serviceId);
  const { currentlyActive, outages } = useServiceOutages(serviceId);

  const [hovBucket, setHovBucket] = useState(null);
  const [currentBucketIndex, setCurrentBucketIndex] = useState(0);

  useFavicon(
    fullscreen
      ? currentlyActive
        ? "/assets/logo-red.png"
        : "/assets/logo-green.png"
      : "/assets/logo-blue.png"
  );

  const theme = useTheme();

  useEffect(() => {
    if (service && service.data.length > 0) {
      setHovBucket(service.data[currentBucketIndex]);
    }
  }, [service, currentBucketIndex]);

  const handleLeftArrowClick = () => {
    setCurrentBucketIndex((prevIndex) =>
      prevIndex > 0 ? prevIndex - 1 : service.data.length - 1
    );
  };

  const handleRightArrowClick = () => {
    setCurrentBucketIndex((prevIndex) =>
      prevIndex < service.data.length - 1 ? prevIndex + 1 : 0
    );
  };

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
          borderTopStyle: fullscreen ? "solid" : "none",
          borderTopColor: theme.border,
          justifyContent: "space-between",
        }}
      >
        <GraphsContainer fullscreen={fullscreen}>
          <Between>
            <Title>{service.service.name}</Title>
            <Subtitle>{service.success_percentage.toFixed(2)}%</Subtitle>
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
              <LatencyChart data={service.data} serviceId={serviceId} />
            ) : (
              <></>
            )}
            <PillRow>
              {service.data.map((d, index) => (
                <StatusPill
                  key={d.bucket}
                  uptime={d.success_percentage}
                  fullscreen={fullscreen}
                >
                  {fullscreen ? (
                    <PillHoverHostController
                      bucket={d}
                      activeBucket={hovBucket}
                      index={index}
                      currentBucketIndex={currentBucketIndex}
                      setCurrentBucketIndex={setCurrentBucketIndex}
                    />
                  ) : null}
                </StatusPill>
              ))}
            </PillRow>
            <Spacer />
          </NoOverflow>

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
              {outages.map((outage) => (
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
