import { createContext } from "react";

export const lightTheme = {
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
};

export const darkTheme = {
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
};

export const ThemePreferenceContext = createContext({
  mode: "system",
  resolvedMode: "light",
  setMode: () => {},
});
