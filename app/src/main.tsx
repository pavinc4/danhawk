import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

document.addEventListener("contextmenu", (e) => e.preventDefault());

document.addEventListener("keydown", (e) => {
  if (e.key === "F12") { e.preventDefault(); return; }
  if (e.ctrlKey && e.shiftKey && e.key === "I") { e.preventDefault(); return; }
  if (e.ctrlKey && e.shiftKey && e.key === "J") { e.preventDefault(); return; }
  // NOTE: Ctrl+Shift+C is intentionally NOT blocked here —
  // it is used by the Quick Calculator AHK extension as a global hotkey.
  // AHK registers at Win32 level so JS blocking it here would only break
  // devtools without affecting the hotkey functionality.
  if (e.ctrlKey && e.key === "u") { e.preventDefault(); return; }
  if ((e.ctrlKey && e.key === "r") || e.key === "F5") { e.preventDefault(); return; }
  if (e.ctrlKey && e.key === "p") { e.preventDefault(); return; }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);