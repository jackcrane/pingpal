import React from "react";
import { Container, H1, H2, Loading, P, ServiceContainer, Spacer } from "./kit";
import useWorkspace from "./hooks/useWorkspace";
import { Service } from "./service/Index";
import { useDocumentTitle } from "@uidotdev/usehooks";
import { Header } from "./Header";
import { Footer } from "./Footer";

const groupServices = (services = []) => {
  const groups = [];
  const map = new Map();
  services.forEach((service) => {
    const label =
      typeof service.group === "string" && service.group.trim().length
        ? service.group.trim()
        : null;
    if (!map.has(label)) {
      const group = { label, services: [] };
      map.set(label, group);
      groups.push(group);
    }
    map.get(label).services.push(service);
  });
  return groups;
};

export default ({ workspaceId }) => {
  const { loading, workspace } = useWorkspace(workspaceId);
  useDocumentTitle(`${workspace?.name} | PingPal`);

  if (loading) return <Loading />;

  if (!workspace || !workspace.services) {
    return (
      <Container>
        <Header />
        <H1>Workspace unavailable</H1>
        <P>Unable to load workspace data right now.</P>
        <Footer />
      </Container>
    );
  }

  return (
    <Container>
      <Header />
      <H1>{workspace.name}</H1>
      <Spacer height="50px" />
      {groupServices(workspace.services).map((group, groupIndex, allGroups) => (
        <React.Fragment
          key={group.label || `ungrouped-${groupIndex}`}
        >
          {group.label && (
            <>
              <H2>{group.label}</H2>
              <Spacer height="20px" />
            </>
          )}
          <ServiceContainer>
            {group.services.map((service) => (
              <Service
                key={service.id}
                serviceId={service.id}
                workspaceId={workspaceId}
              />
            ))}
          </ServiceContainer>
          {groupIndex < allGroups.length - 1 && <Spacer height="40px" />}
        </React.Fragment>
      ))}
      <Footer />
    </Container>
  );
};
