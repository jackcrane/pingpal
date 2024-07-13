import React, { useEffect, useState } from "react";
import { DashboardPage } from "../components/DashboardPage";
import {
  ActionButton,
  ActionLink,
  Between,
  Button,
  Card,
  Column,
  H2,
  H3,
  H4,
  Hr,
  Kbd,
  Link,
  Loading,
  MicroTextInput,
  Orange,
  P,
  Red,
  SegmentedController,
  Spacer,
  TextInput,
  TextLink,
  Tooltip,
  U,
} from "../kit";
import moment from "moment";
import { useAuth } from "../hooks/useAuth";
import styled from "styled-components";
import { useParams } from "react-router-dom";
import { useWorkspace } from "../hooks/useWorkspace";
import { Modification } from "../components/Modification";
import { NegativeMargin, WorkspaceBox } from "./WorkspaceList";
import { ReorderServices } from "../components/ReorderServices";

export const Workspace = () => {
  const { loading, user } = useAuth({});
  const { workspaceId } = useParams();
  const {
    loading: workspaceLoading,
    workspace: remoteWorkspace,
    requestBillingPortal,
  } = useWorkspace(workspaceId, true);
  const [workspace, setWorkspace] = useState(remoteWorkspace);

  useEffect(() => {
    setWorkspace(remoteWorkspace);
  }, [remoteWorkspace]);

  const [subscriptionSelectorHovered, setSubscriptionSelectorHovered] =
    useState(false);

  const [reorderingServices, setReorderingServices] = useState(false);

  if (loading || workspaceLoading) return <Loading />;
  return (
    <DashboardPage title="Dashboard">
      <H2>{workspace.name}</H2>
      <Hr />
      <Between style={{ gap: 10 }} at>
        <Column style={{ width: "100%", gap: 2 }}>
          <H3>Basic information</H3>
          <Between>
            <Tooltip
              text={"ID"}
              message={
                "If you reach out to us for support, we may need your workspace ID!"
              }
            />
            <Kbd>{workspace?.id}</Kbd>
          </Between>
          <Between>
            Created At
            <Kbd>{moment(workspace.createdAt).format("M/D h:m a")}</Kbd>
          </Between>
          <Between>
            Name
            <MicroTextInput
              value={workspace.name}
              onInput={(e) =>
                setWorkspace({ ...workspace, name: e.target.value })
              }
            />
          </Between>
          <Between at>
            Subdomain
            <MicroTextInput
              value={workspace.subdomain}
              onInput={(e) =>
                setWorkspace({ ...workspace, subdomain: e.target.value })
              }
            />
          </Between>
          {workspace.subdomain !== remoteWorkspace.subdomain && (
            <Red>
              <b>Warning:</b> Changing the subdomain will change the URL of your
              statuspage!
            </Red>
          )}
          <Between>
            Subscription Tier
            <div
              onMouseEnter={() => setSubscriptionSelectorHovered(true)}
              onMouseLeave={() => setSubscriptionSelectorHovered(false)}
            >
              <SegmentedController
                segments={["FREE", "LAUNCH", "PRO"]}
                activeSegment={
                  workspace.tier === "FREE"
                    ? 0
                    : workspace.tier === "LAUNCH"
                    ? 1
                    : 2
                }
                onSegmentChange={(index) =>
                  setWorkspace({
                    ...workspace,
                    tier: index === 0 ? "FREE" : index === 1 ? "LAUNCH" : "PRO",
                  })
                }
                disabled={!workspace.inGoodPaymentStanding}
              />
            </div>
          </Between>
          {!workspace.inGoodPaymentStanding && (
            <Orange
              invert={
                subscriptionSelectorHovered && !workspace.inGoodPaymentStanding
              }
            >
              You must set up billing information before you can modify the
              subscription tier
            </Orange>
          )}
          <Between>
            <P>Open billing portal</P>
            <TextLink
              onClick={requestBillingPortal}
              orange={
                subscriptionSelectorHovered && !workspace.inGoodPaymentStanding
              }
            >
              Open
            </TextLink>
          </Between>
          <Spacer />
          <H3>Services</H3>
          <Block>
            <Button onClick={() => setReorderingServices(!reorderingServices)}>
              {reorderingServices ? "Done" : "Reorder services"}
            </Button>
          </Block>
          <Spacer />
          {reorderingServices ? (
            <>
              <Block>
                <ReorderServices
                  services={workspace.services}
                  onUpdate={(sorted) =>
                    setWorkspace({
                      ...workspace,
                      services: sorted,
                    })
                  }
                />
              </Block>
            </>
          ) : (
            <NegativeMargin>
              <Block>
                {workspace?.services
                  ?.sort((a, b) => a.sort - b.sort)
                  ?.map((service) => (
                    <WorkspaceBox
                      key={service.id}
                      iframeSrc={service.domain}
                      title={service.name}
                      linkTarget={`/workspace/${workspace.id}/service/${service.id}`}
                    />
                  ))}
              </Block>
            </NegativeMargin>
          )}
        </Column>
        <Column style={{ width: 300 }}>
          <H3>Modifications</H3>
          <Modification oldObject={remoteWorkspace} newObject={workspace} />
        </Column>
      </Between>
    </DashboardPage>
  );
};

const Block = styled.div`
  display: block;
`;
