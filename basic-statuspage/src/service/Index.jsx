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
} from "./Kit";
import useService from "../hooks/useService";
import { Between, H3, Relative, Row, Spacer } from "../kit";
import { LatencyChart } from "../lib/LatencyChart";
import { useTheme } from "styled-components";
import {
  ArrowFatUp,
  ArrowLeft,
  ArrowRight,
  ArrowSquareLeft,
  ArrowSquareRight,
  SmileyMelting,
  WarningDiamond,
} from "@phosphor-icons/react";
import { Inspect } from "./Inspect";
import { PillHoverHostController } from "./PillHoverHostController";

export const Service = ({ serviceId, fullscreen = false }) => {
  let globalTimeout = null;
  const { loading, service } = useService(serviceId);

  const [hovBucket, setHovBucket] = useState(null);
  const [currentBucketIndex, setCurrentBucketIndex] = useState(0);

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
