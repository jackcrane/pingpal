import React, { useEffect } from "react";
import { Container, H1, H2, ServiceContainer, Spacer } from "../kit";
import useWorkspace from "../hooks/useWorkspace";
import { Service } from "./Index";
import { Link, useParams } from "react-router-dom";
import useService from "../hooks/useService";
import useSubdomain from "../hooks/useSubdomain";
import { BackToWorkspace } from "./Kit";
import { ArrowCircleLeft } from "@phosphor-icons/react";

export default ({}) => {
  const { serviceId } = useParams();
  const { workspaceId } = useSubdomain();
  const {
    loading: workspaceLoading,
    workspace,
    refetch,
  } = useWorkspace(workspaceId);
  const { loading, service } = useService(serviceId);

  useEffect(() => {
    refetch();
  }, [workspaceId]);

  if (loading || workspaceLoading) return <Container>Loading...</Container>;

  return (
    <Container>
      <H1>{service.service.name}</H1>
      <BackToWorkspace to="/">
        <ArrowCircleLeft />
        {workspace.name || "Back to workspace"}
      </BackToWorkspace>
      <Spacer height="50px" />
      <ServiceContainer>
        <Service key={serviceId} serviceId={serviceId} fullscreen={true} />
      </ServiceContainer>
    </Container>
  );
};
