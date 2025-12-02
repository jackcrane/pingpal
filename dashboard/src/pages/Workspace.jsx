import React, { useEffect, useState } from "react";
import { DashboardPage } from "../components/DashboardPage";
import {
  ActionButton,
  Between,
  Button,
  Column,
  H2,
  H3,
  H4,
  Hr,
  Kbd,
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
import { useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "../hooks/useWorkspace";
import { Modification } from "../components/Modification";
import { NegativeMargin, WorkspaceBox } from "./WorkspaceList";
import { ReorderServices } from "../components/ReorderServices";
import { AuthFetch } from "../lib/url";

const SERVICE_METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
];

const SERVICE_FORM_DEFAULT = {
  name: "",
  domain: "",
  method: "GET",
  expectedStatus: "200",
  maxLatency: "5000",
  checkInterval: "60",
  expectedText: "",
  headers: "",
};

export const Workspace = () => {
  const { loading } = useAuth({});
  const { workspaceId } = useParams();
  const {
    loading: workspaceLoading,
    workspace: remoteWorkspace,
    requestBillingPortal,
    refetch: refetchWorkspace,
  } = useWorkspace(workspaceId, true);
  const [workspace, setWorkspace] = useState(remoteWorkspace);
  const navigate = useNavigate();
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    ...SERVICE_FORM_DEFAULT,
  });
  const [creatingService, setCreatingService] = useState(false);
  const [serviceError, setServiceError] = useState(null);
  const [serviceSuccess, setServiceSuccess] = useState(null);
  const isNewWorkspace = workspaceId === "new";

  useEffect(() => {
    setWorkspace(remoteWorkspace);
  }, [remoteWorkspace]);

  const canCreateWorkspace =
    Boolean(workspace?.name?.trim() && workspace?.subdomain?.trim()) &&
    !creatingWorkspace;

  const handleCreateWorkspace = async () => {
    if (!isNewWorkspace) return;
    setCreateError(null);
    setCreatingWorkspace(true);
    try {
      const response = await AuthFetch("/dashboard/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: workspace.name,
          subdomain: workspace.subdomain,
          tier: workspace.tier,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setCreateError(data?.error || "Unable to create workspace");
        return;
      }

      navigate(`/workspace/${data.id}`);
    } catch (error) {
      console.error(error);
      setCreateError("Something went wrong while creating the workspace.");
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const updateServiceFormField = (field, value) => {
    setServiceError(null);
    setServiceSuccess(null);
    setServiceForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const canAddService =
    Boolean(serviceForm.name.trim() && serviceForm.domain.trim()) &&
    !creatingService &&
    !isNewWorkspace;

  const handleCreateService = async (event) => {
    event.preventDefault();
    if (!workspaceId || isNewWorkspace) return;
    setServiceError(null);
    setServiceSuccess(null);
    setCreatingService(true);
    try {
      const response = await AuthFetch(
        `/dashboard/workspaces/${workspaceId}/services`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: serviceForm.name.trim(),
            domain: serviceForm.domain.trim(),
            method: serviceForm.method,
            expectedStatus: serviceForm.expectedStatus,
            checkInterval: serviceForm.checkInterval,
            maxLatency: serviceForm.maxLatency,
            expectedText: serviceForm.expectedText,
            headers: serviceForm.headers,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setServiceError(data?.error || "Unable to create service");
        return;
      }

      setServiceSuccess("Service added");
      setServiceForm({ ...SERVICE_FORM_DEFAULT });
      await refetchWorkspace();
    } catch (error) {
      console.error(error);
      setServiceError("Something went wrong while creating the service.");
    } finally {
      setCreatingService(false);
    }
  };

  const [subscriptionSelectorHovered, setSubscriptionSelectorHovered] =
    useState(false);

  const [reorderingServices, setReorderingServices] = useState(false);

  if (loading || workspaceLoading) return <Loading />;
  return (
    <DashboardPage title="Dashboard">
      <Between>
        <H2>
          {workspace?.name ||
            (isNewWorkspace ? "New workspace" : "Workspace details")}
        </H2>
        {isNewWorkspace && (
          <ActionButton
            disabled={!canCreateWorkspace}
            onClick={handleCreateWorkspace}
          >
            {creatingWorkspace ? "Creating..." : "Create workspace"}
          </ActionButton>
        )}
      </Between>
      {createError && <Red>{createError}</Red>}
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
              onInput={(e) => {
                setWorkspace({ ...workspace, name: e.target.value });
                if (isNewWorkspace) {
                  setCreateError(null);
                }
              }}
            />
          </Between>
          <Between at>
            Subdomain
            <MicroTextInput
              value={workspace.subdomain}
              onInput={(e) => {
                setWorkspace({ ...workspace, subdomain: e.target.value });
                if (isNewWorkspace) {
                  setCreateError(null);
                }
              }}
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
          {isNewWorkspace ? (
            <Orange>
              Save this workspace before you can register services to monitor.
            </Orange>
          ) : (
            <ServiceForm onSubmit={handleCreateService}>
              <ServiceFormRow>
                <FormField>
                  <FormLabel>Service name</FormLabel>
                  <TextInput
                    value={serviceForm.name}
                    onChange={(e) =>
                      updateServiceFormField("name", e.target.value)
                    }
                    placeholder="My API"
                  />
                </FormField>
                <FormField>
                  <FormLabel>Service domain</FormLabel>
                  <TextInput
                    value={serviceForm.domain}
                    onChange={(e) =>
                      updateServiceFormField("domain", e.target.value)
                    }
                    placeholder="https://example.com/health"
                  />
                </FormField>
              </ServiceFormRow>
              <ServiceFormRow>
                <FormField>
                  <FormLabel>Method</FormLabel>
                  <StyledSelect
                    value={serviceForm.method}
                    onChange={(e) =>
                      updateServiceFormField("method", e.target.value)
                    }
                  >
                    {SERVICE_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </StyledSelect>
                </FormField>
                <FormField>
                  <FormLabel>Expected status</FormLabel>
                  <TextInput
                    type="number"
                    min={100}
                    max={599}
                    value={serviceForm.expectedStatus}
                    onChange={(e) =>
                      updateServiceFormField("expectedStatus", e.target.value)
                    }
                  />
                </FormField>
              </ServiceFormRow>
              <ServiceFormRow>
                <FormField>
                  <FormLabel>Max latency (ms)</FormLabel>
                  <TextInput
                    type="number"
                    min={100}
                    value={serviceForm.maxLatency}
                    onChange={(e) =>
                      updateServiceFormField("maxLatency", e.target.value)
                    }
                  />
                </FormField>
                <FormField>
                  <FormLabel>Check interval (seconds)</FormLabel>
                  <TextInput
                    type="number"
                    min={30}
                    value={serviceForm.checkInterval}
                    onChange={(e) =>
                      updateServiceFormField("checkInterval", e.target.value)
                    }
                  />
                </FormField>
              </ServiceFormRow>
              <FormField>
                <FormLabel>Expected text (optional)</FormLabel>
                <TextInput
                  value={serviceForm.expectedText}
                  onChange={(e) =>
                    updateServiceFormField("expectedText", e.target.value)
                  }
                />
              </FormField>
              <FormField>
                <FormLabel>Headers (optional JSON)</FormLabel>
                <TextInput
                  value={serviceForm.headers}
                  onChange={(e) =>
                    updateServiceFormField("headers", e.target.value)
                  }
                  placeholder='{"Authorization":"Bearer ..."}'
                />
              </FormField>
              {serviceError && <Red>{serviceError}</Red>}
              {serviceSuccess && <P>{serviceSuccess}</P>}
              <ActionButton type="submit" disabled={!canAddService}>
                {creatingService ? "Adding..." : "Add service"}
              </ActionButton>
            </ServiceForm>
          )}
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

const ServiceForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
`;

const ServiceFormRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 200px;
`;

const FormLabel = styled.label`
  font-size: 0.85rem;
  color: ${(props) => props.theme.subtext};
`;

const StyledSelect = styled.select`
  padding: 10px;
  background-color: ${(props) => props.theme.bg};
  color: ${(props) => props.theme.text};
  border-radius: 5px;
  border: 1px solid ${(props) => props.theme.border};
`;
