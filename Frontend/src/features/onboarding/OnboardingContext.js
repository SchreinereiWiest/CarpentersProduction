import { createContext, useContext } from "react";

export const OnboardingContext = createContext(null);

export function useOnboarding() {
  return useContext(OnboardingContext);
}
