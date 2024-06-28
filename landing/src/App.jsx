import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { Index } from "./pages/Index";

export default () => {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Index />,
    },
  ]);

  return (
    <React.StrictMode>
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
    </React.StrictMode>
  );
};
