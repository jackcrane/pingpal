import React from "react";
import { Container, H1, Loading, ServiceContainer, Spacer } from "./kit";
import useWorkspace from "./hooks/useWorkspace";
import { Service } from "./service/Index";
import { useDocumentTitle } from "@uidotdev/usehooks";
import { Header } from "./Header";
import { Footer } from "./Footer";

export default ({ workspaceId }) => {
  const { loading, workspace } = useWorkspace(workspaceId);
  useDocumentTitle(`${workspace?.name} | PingPal`);

  if (loading) return <Loading />;

  return (
    <Container>
      <Header />
      <H1>{workspace.name}</H1>
      <Spacer height="50px" />
      <ServiceContainer>
        {workspace.services.map((service) => (
          <Service
            key={service.id}
            serviceId={service.id}
            workspaceId={workspaceId}
          />
        ))}
      </ServiceContainer>
      <Footer />
    </Container>
  );
};
