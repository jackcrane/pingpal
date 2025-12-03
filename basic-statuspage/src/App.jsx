import React, { useEffect, useMemo, useState } from "react";
import { Loading } from "./kit";
import Workspace from "./Workspace";
import { ThemeProvider } from "styled-components";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ServicePage from "./service/Page";
import useSubdomain from "./hooks/useSubdomain";
import { useFavicon } from "@uidotdev/usehooks";
import {
  ThemePreferenceContext,
  darkTheme,
  lightTheme,
} from "./theme";
import SigningPage from "./signing/Page";

const THEME_STORAGE_KEY = "themePreference";
const THEME_COOKIE_KEY = "themePreference";

const isValidPreference = (value) =>
  ["light", "dark", "system"].includes(value);

const getCookiePreference = () => {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie?.split(";") || [];
  for (const cookie of cookies) {
    const [rawKey, rawValue] = cookie.split("=");
    if (rawKey && rawKey.trim() === THEME_COOKIE_KEY) {
      return decodeURIComponent(rawValue || "").trim();
    }
  }
  return null;
};

const persistThemePreference = (mode) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  if (typeof document !== "undefined") {
    const oneYear = 60 * 60 * 24 * 365;
    document.cookie = `${THEME_COOKIE_KEY}=${mode};path=/;max-age=${oneYear}`;
  }
};

export default () => {
  const { loading, workspaceId } = useSubdomain();
  useFavicon("/assets/logo-blue.png");
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === "undefined") return "system";
    const cookiePref = getCookiePreference();
    if (isValidPreference(cookiePref)) return cookiePref;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isValidPreference(stored) ? stored : "system";
  });
  const [prefersDark, setPrefersDark] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    window.workspaceId = workspaceId;
  }, [workspaceId]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => setPrefersDark(event.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  useEffect(() => {
    persistThemePreference(themeMode);
  }, [themeMode]);

  const resolvedMode =
    themeMode === "system" ? (prefersDark ? "dark" : "light") : themeMode;
  const theme = resolvedMode === "dark" ? darkTheme : lightTheme;
  const themeContextValue = useMemo(
    () => ({
      mode: themeMode,
      resolvedMode,
      setMode: setThemeMode,
    }),
    [themeMode, resolvedMode]
  );

  const router = createBrowserRouter([
    {
      path: "/",
      element: <Workspace workspaceId={workspaceId} />,
    },
    {
      path: "/:serviceId",
      element: <ServicePage />,
    },
    {
      path: "/_/sign",
      element: <SigningPage workspaceId={workspaceId} />,
    },
  ]);

  if (loading) return <Loading />;
  return (
    <ThemePreferenceContext.Provider value={themeContextValue}>
      <ThemeProvider theme={theme}>
        <RouterProvider router={router} />
      </ThemeProvider>
    </ThemePreferenceContext.Provider>
  );
};
