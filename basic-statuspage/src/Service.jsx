import React, { useEffect, useState } from "react";
import {
  Container,
  PillRow,
  StatusPill,
  Subtitle,
  Title,
  TitleSkeleton,
} from "./Service.kit";
import useService from "./hooks/useService";
import { Between, Row, Spacer } from "./kit";
import { LatencyChart } from "./lib/LatencyChart";

export const Service = ({ serviceId }) => {
  let globalTimeout = null;
  const { loading, service } = useService(serviceId);

  if (loading)
    return (
      <Container>
        <TitleSkeleton />
      </Container>
    );

  return (
    <Container id={serviceId}>
      <Between>
        <Title>{service.service.name}</Title>
        <Subtitle>{service.success_percentage.toFixed(2)}%</Subtitle>
      </Between>
      <Spacer />
      {false ? (
        <LatencyChart data={service.data} serviceId={serviceId} />
      ) : (
        <></>
      )}
      <PillRow>
        {service.data.map((d) => (
          <StatusPill key={d.bucket} uptime={d.success_percentage} />
        ))}
      </PillRow>
    </Container>
  );
};
