import React, { useEffect, useMemo } from "react";
import { Container, H1, Loading, P, ServiceContainer, Spacer } from "../kit";
import useWorkspace from "../hooks/useWorkspace";
import { Service } from "./Index";
import { useParams } from "react-router-dom";
import useService from "../hooks/useService";
import useSubdomain from "../hooks/useSubdomain";
import { BackToWorkspace } from "./Kit";
import { ArrowCircleLeft } from "@phosphor-icons/react";
import { useDocumentTitle } from "@uidotdev/usehooks";
import { Header } from "../Header";
import { Footer } from "../Footer";
import styled from "styled-components";
import { formatDescription } from "../lib/formatDescription";

export default ({}) => {
  const { serviceId } = useParams();
  const { workspaceId } = useSubdomain();
  const {
    loading: workspaceLoading,
    workspace,
    refetch,
  } = useWorkspace(workspaceId);
  const { loading, service } = useService(serviceId, workspaceId);
  const rawDescription = service?.service?.description;
  const serviceDescription =
    typeof rawDescription === "string" ? rawDescription.trim() : "";
  const hasDescription = serviceDescription.length > 0;
  const formattedDescription = useMemo(
    () => (hasDescription ? formatDescription(serviceDescription) : ""),
    [hasDescription, serviceDescription]
  );

  useDocumentTitle(`${workspace?.name} | ${service?.service?.name} | PingPal`);

  useEffect(() => {
    window.workspaceId = workspaceId;
    refetch();
  }, [workspaceId]);

  if (loading || workspaceLoading) return <Loading />;

  if (!service?.service) {
    return (
      <Container>
        <Header />
        <P>Unable to load service details right now.</P>
        <Footer />
      </Container>
    );
  }

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
      {hasDescription && (
        <>
          <Spacer height="15px" />
          <DescriptionBlock
            dangerouslySetInnerHTML={{ __html: formattedDescription }}
          />
        </>
      )}
      <Spacer height="50px" />
      <ServiceContainer>
        <Service
          key={serviceId}
          serviceId={serviceId}
          fullscreen={true}
          workspaceId={workspaceId}
        />
      </ServiceContainer>
      <Footer />
    </Container>
  );
};

const DescriptionBlock = styled(P)`
  max-width: 720px;
  margin: 0;
  white-space: pre-line;
  line-height: 1.6;
  a {
    color: ${({ theme }) => theme.subtext};
    text-decoration: underline;
    text-decoration-color: ${({ theme }) => theme.subtext};
    text-decoration-thickness: 2px;
    transition: color 0.2s;
    &:hover {
      color: ${({ theme }) => theme.text};
    }
  }
  strong {
    color: ${({ theme }) => theme.text};
  }
  u {
    text-decoration-thickness: 2px;
  }
`;
