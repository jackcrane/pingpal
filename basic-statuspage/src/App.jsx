import React, { useEffect } from "react";
import { Container, H1, Loading, Spacer } from "./kit";
import { Service } from "./service/Index";
import Workspace from "./Workspace";
import { ThemeProvider } from "styled-components";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ServicePage from "./service/Page";
import useSubdomain from "./hooks/useSubdomain";
import { useFavicon } from "@uidotdev/usehooks";

export default () => {
  const { loading, workspaceId } = useSubdomain();
  useFavicon("/assets/logo-blue.png");

  useEffect(() => {
    window.workspaceId = workspaceId;
  }, [workspaceId]);

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

  if (loading) return <Loading />;
  return (
    <ThemeProvider
      // theme={{
      //   bg: "#202528",
      //   hover: "#3e454a",
      //   text: "#e9ecef",
      //   border: "#495057",
      //   subtext: "#adb5bd",
      //   success: "#28a745",
      //   okaynews: "#9acd32",
      //   danger: "#dc3545",
      //   warning: "#ffc107",
      //   badnews: "#ff7707",
      //   blue: "#007bff",
      // }}
      theme={{
        bg: "#f4f4f4",
        hover: "#e6e8ea",
        text: "#212529",
        border: "#c4c7ca",
        subtext: "#6c757d",
        success: "#28a745",
        okaynews: "#8bc34a",
        danger: "#dc3545",
        warning: "#ffc107",
        badnews: "#ff6f00",
        blue: "#0d6efd",
      }}
    >
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};
