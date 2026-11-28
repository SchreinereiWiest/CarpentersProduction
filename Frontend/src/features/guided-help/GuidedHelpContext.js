import { createContext, useContext } from "react";

export const GuidedHelpContext = createContext(null);

export function useGuidedHelp() {
  return useContext(GuidedHelpContext);
}
