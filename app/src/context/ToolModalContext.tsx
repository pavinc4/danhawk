import { createContext, useContext } from "react";

interface ToolModalCtx {
  openTool: (slug: string) => void;
  closeTool: () => void;
  activeSlug: string | null;
}

export const ToolModalContext = createContext<ToolModalCtx>({
  openTool: () => { },
  closeTool: () => { },
  activeSlug: null
});

export function useToolModal() {
  return useContext(ToolModalContext);
}
