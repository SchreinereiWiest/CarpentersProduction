import prisma from "../../infrastructure/database/prisma.js";

export const ONBOARDING_VERSION = 1;

export const ONBOARDING_STEPS = [
  { id: "welcome" },
  { id: "company" },
  { id: "team" },
  { id: "workspace" },
  { id: "production", feature: "work-preparation" },
  { id: "calculation", feature: "calculation" },
  { id: "integrations" },
  { id: "shop-settings", feature: "shop" },
  { id: "articles", feature: "shop", optional: true },
  { id: "customers", feature: "crm", optional: true },
  { id: "management", feature: "business-management" },
  { id: "tour", optional: true }
];

export const getVisibleOnboardingSteps = features => {
  const enabled = new Set(features || []);
  return ONBOARDING_STEPS.filter(step => !step.feature || enabled.has(step.feature));
};

const unique = values => [...new Set(values)];

const present = (record, features) => {
  const steps = getVisibleOnboardingSteps(features);
  if (!record) {
    return {
      required: false,
      status: "completed",
      currentStep: null,
      completedSteps: [],
      skippedSteps: [],
      version: ONBOARDING_VERSION,
      steps
    };
  }

  return {
    required: record.status !== "completed",
    status: record.status,
    currentStep: record.status === "completed" ? null : record.currentStep,
    completedSteps: record.completedSteps,
    skippedSteps: record.skippedSteps,
    version: record.version,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    resetCount: record.resetCount,
    steps
  };
};

async function currentState() {
  return prisma.tenantOnboarding.findFirst();
}

export async function getOnboarding(req, res) {
  res.set("Cache-Control", "no-store");
  res.json(present(await currentState(), req.license.features));
}

export async function updateOnboardingStep(req, res) {
  const action = req.body?.action;
  const stepId = String(req.body?.stepId || "");
  const steps = getVisibleOnboardingSteps(req.license.features);
  const stepIndex = steps.findIndex(step => step.id === stepId);
  const record = await currentState();

  if (!record || record.status === "completed") {
    return res.status(409).json({ message: "Die Ersteinrichtung ist nicht aktiv." });
  }
  if (record.currentStep !== stepId || stepIndex < 0) {
    return res.status(409).json({ message: "Bitte schließe zuerst den aktuellen Einrichtungsschritt ab." });
  }
  if (!['complete', 'skip'].includes(action)) {
    return res.status(400).json({ message: "Ungültige Schrittaktion." });
  }
  if (action === "skip" && !steps[stepIndex].optional) {
    return res.status(400).json({ message: "Dieser Einrichtungsschritt kann nicht übersprungen werden." });
  }

  const completedSteps = action === "complete"
    ? unique([...record.completedSteps, stepId])
    : record.completedSteps.filter(id => id !== stepId);
  const skippedSteps = action === "skip"
    ? unique([...record.skippedSteps, stepId])
    : record.skippedSteps.filter(id => id !== stepId);
  const nextStep = steps[stepIndex + 1];
  const finished = !nextStep;

  const updated = await prisma.$transaction(async transaction => {
    const state = await transaction.tenantOnboarding.update({
      where: { id: record.id },
      data: {
        status: finished ? "completed" : "in_progress",
        currentStep: finished ? stepId : nextStep.id,
        completedSteps,
        skippedSteps,
        completedById: finished ? req.user.id : null,
        completedAt: finished ? new Date() : null
      }
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: req.user.id,
        action: finished ? "tenant.onboarding_completed" : `tenant.onboarding_step_${action}`,
        entityType: "TenantOnboarding",
        entityId: state.id,
        metadata: { stepId, nextStep: nextStep?.id || null, version: ONBOARDING_VERSION }
      }
    });
    return state;
  });

  return res.json(present(updated, req.license.features));
}

export async function resetOnboarding(req, res) {
  const firstStep = getVisibleOnboardingSteps(req.license.features)[0].id;
  const existing = await currentState();
  const updated = await prisma.$transaction(async transaction => {
    const state = existing
      ? await transaction.tenantOnboarding.update({
          where: { id: existing.id },
          data: {
            status: "pending",
            currentStep: firstStep,
            completedSteps: [],
            skippedSteps: [],
            version: ONBOARDING_VERSION,
            resetCount: { increment: 1 },
            startedById: req.user.id,
            completedById: null,
            startedAt: new Date(),
            completedAt: null
          }
        })
      : await transaction.tenantOnboarding.create({
          data: {
            status: "pending",
            currentStep: firstStep,
            version: ONBOARDING_VERSION,
            resetCount: 1,
            startedById: req.user.id
          }
        });
    await transaction.auditLog.create({
      data: {
        actorUserId: req.user.id,
        action: "tenant.onboarding_reset",
        entityType: "TenantOnboarding",
        entityId: state.id,
        metadata: { version: ONBOARDING_VERSION, dataPreserved: true }
      }
    });
    return state;
  });

  res.json(present(updated, req.license.features));
}
