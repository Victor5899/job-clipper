import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../ui/styles/fonts";
import "../ui/styles/base.css";
import { PopupApp } from "./PopupApp";

const root = document.getElementById("root");
if (!root) throw new Error("Popup root element missing");

createRoot(root).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>,
);
