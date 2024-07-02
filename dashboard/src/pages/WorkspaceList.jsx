import React from "react";
import { DashboardPage } from "../components/DashboardPage";
import {
  ActionButton,
  ActionLink,
  Between,
  H2,
  H3,
  Link,
  Loading,
  P,
  Spacer,
  U,
} from "../kit";
import moment from "moment";
import { useAuth } from "../hooks/useAuth";
import { useWorkspaces } from "../hooks/useWorkspaces";
import styled from "styled-components";

export const WorkspaceList = () => {
  const { loading, user } = useAuth({});
  const { loading: workspacesLoading, workspaces } = useWorkspaces();

  if (loading || workspacesLoading) return <Loading />;
  return (
    <DashboardPage title="Dashboard">
      <Between>
        <H2>Your workspaces</H2>
        <ActionLink to="/workspace/new">Create a workspace</ActionLink>
      </Between>
      {workspaces.length === 0 ? (
        <P>
          You don't have any workspaces. You can create one off to the right!
        </P>
      ) : (
        <>
          <P>
            Click on one of your workspaces to see more content and to modify
            it's settings
          </P>
          <Spacer />
          <NegativeMargin>
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                to={`/workspace/${workspace.id}`}
                style={{ margin: 10 }}
              >
                <WorkspaceCard>
                  <PreviewContainer>
                    <PreviewIframe
                      src={`https://${workspace.subdomain}.pingpal.online`}
                    />
                  </PreviewContainer>
                  <Spacer height={"10px"} />
                  <H3>{workspace.name}</H3>
                  <P>
                    <U>{workspace.subdomain}.pingpal.online</U>
                  </P>
                </WorkspaceCard>
              </Link>
            ))}
          </NegativeMargin>
        </>
      )}
    </DashboardPage>
  );
};

const NegativeMargin = styled.div`
  margin: -10px;
`;

const WorkspaceCard = styled.div`
  display: flex;
  flex-direction: column;
`;

const PreviewIframe = styled.iframe`
  position: absolute;
  top: 0;
  left: 0;
  width: 300%;
  height: 300%;
  border: 0;
  transform: scale(0.3333333333); /* Scale down to 50% */
  transform-origin: 0 0;
  pointer-events: none;
`;

const PreviewContainer = styled.div`
  position: relative;
  width: 300px; /* Adjust as needed */
  padding-top: 70%; /* 16:9 Aspect Ratio */
  overflow: hidden;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 5px;
`;
