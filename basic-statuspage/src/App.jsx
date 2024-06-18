import React from "react";
import { Container, H1, Spacer } from "./kit";
import { Service } from "./Service";
import useSubdomain from "./hooks/useSubdomain";
import Workspace from "./Workspace";
import { ThemeProvider } from "styled-components";
const WORKSPACE_ID = "47309c56-56ee-47af-9782-bbd2c6557136";

export default () => {
  const { loading, workspaceId } = useSubdomain();

  if (loading) return <Container>Loading...</Container>;
  return (
    <ThemeProvider
      theme={{
        bg: "#343a40",
        hover: "#3e454a",
        text: "#e9ecef",
        border: "#495057",
        subtext: "#adb5bd",
        success: "#28a745",
        okaynews: "#9acd32",
        danger: "#dc3545",
        warning: "#ffc107",
        badnews: "#ff7707",
      }}
    >
      <Workspace workspaceId={workspaceId} />
    </ThemeProvider>
  );
};
