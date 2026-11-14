import axios from "axios";

export const loadOnboarding = async () => (await axios.get("/api/onboarding")).data;
export const updateOnboardingStep = async (stepId, action = "complete") => (
  await axios.put("/api/onboarding/step", { stepId, action })
).data;
export const resetOnboarding = async () => (await axios.post("/api/onboarding/reset")).data;
