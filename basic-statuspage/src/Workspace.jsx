import React from "react";
import { Container, H1, ServiceContainer, Spacer } from "./kit";
import useWorkspace from "./hooks/useWorkspace";
import { Service } from "./Service";

export default ({ workspaceId }) => {
  const { loading, workspace } = useWorkspace(workspaceId);

  if (loading) return <Container>Loading...</Container>;

  return (
    <Container>
      <H1>{workspace.name}</H1>
      <Spacer height="50px" />
      <ServiceContainer>
        {workspace.services.map((service) => (
          <Service key={service.id} serviceId={service.id} />
        ))}
      </ServiceContainer>
    </Container>
  );
};
