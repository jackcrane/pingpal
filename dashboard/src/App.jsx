import React, { useEffect } from "react";
import { Container, H1, Loading, Spacer } from "./kit";
import { ThemeProvider } from "styled-components";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useFavicon } from "@uidotdev/usehooks";
import { Register } from "./pages/Register";
import { Login } from "./pages/Login";

export default () => {
  useFavicon("/assets/logo-blue.png");

  const router = createBrowserRouter([
    {
      path: "/register",
      element: <Register />,
    },
    {
      path: "/login",
      element: <Login />,
    },
  ]);

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
