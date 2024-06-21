import React, { useEffect } from "react";
import { Container, H1, H2, Loading, ServiceContainer, Spacer } from "../kit";
import useWorkspace from "../hooks/useWorkspace";
import { Service } from "./Index";
import { Link, useParams } from "react-router-dom";
import useService from "../hooks/useService";
import useSubdomain from "../hooks/useSubdomain";
import { BackToWorkspace } from "./Kit";
import { ArrowCircleLeft } from "@phosphor-icons/react";
import { useDocumentTitle } from "@uidotdev/usehooks";
import { Header } from "../Header";
import { Footer } from "../Footer";

export default ({}) => {
  const { serviceId } = useParams();
  const { workspaceId } = useSubdomain();
  const {
    loading: workspaceLoading,
    workspace,
    refetch,
  } = useWorkspace(workspaceId);
  const { loading, service } = useService(serviceId);

  useDocumentTitle(`${workspace?.name} | ${service?.service?.name} | PingPal`);

  useEffect(() => {
    window.workspaceId = workspaceId;
    refetch();
  }, [workspaceId]);

  if (loading || workspaceLoading) return <Loading />;

  return (
    <Container>
      <Header />
      <div>
        <H1>{service.service.name}</H1>
        <BackToWorkspace to="/">
          <ArrowCircleLeft />
          {workspace.name || "Back to workspace"}
        </BackToWorkspace>
      </div>
      <Spacer height="50px" />
      <ServiceContainer>
        <Service key={serviceId} serviceId={serviceId} fullscreen={true} />
      </ServiceContainer>
      <Footer />
    </Container>
  );
};
