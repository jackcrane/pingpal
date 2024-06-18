import React from "react";
import { Container, H1, Spacer } from "./kit";
import { Service } from "./Service";
import Workspace from "./Workspace";
import { ThemeProvider } from "styled-components";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ServicePage from "./ServicePage";
import useSubdomain from "./hooks/useSubdomain";

export default () => {
  const { loading, workspaceId } = useSubdomain();

  const router = createBrowserRouter([
    {
      path: "/",
      element: <Workspace workspaceId={workspaceId} />,
    },
    {
      path: "/:serviceId",
      element: <ServicePage />,
    },
  ]);

  if (loading) return <Container>Loading...</Container>;
  return (
    <ThemeProvider
      theme={{
        bg: "#202528",
        hover: "#3e454a",
        text: "#e9ecef",
        border: "#495057",
        subtext: "#adb5bd",
        success: "#28a745",
        okaynews: "#9acd32",
        danger: "#dc3545",
        warning: "#ffc107",
        badnews: "#ff7707",
        blue: "#007bff",
      }}
    >
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};
