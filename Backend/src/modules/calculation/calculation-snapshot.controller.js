import {
  createManualCalculationSnapshot,
  deleteManualCalculationSnapshot,
  listReleasedCalculationSnapshots,
  presentCalculationSnapshot,
  releaseProjectCalculationSnapshot,
  updateManualCalculationSnapshot
} from "./calculation-snapshots.service.js";

const manualSnapshotError = (res, error) => {
  const expected = error.statusCode || String(error.code || "").startsWith("MANUAL_SNAPSHOT_");
  if (!expected) throw error;
  return res.status(error.statusCode || 400).json({
    error: error.code || "MANUAL_SNAPSHOT_INVALID",
    message: error.message || "Die manuelle Nachkalkulation ist ungültig."
  });
};

export async function releaseCalculationSnapshot(req, res) {
  try {
    const { snapshot, created } = await releaseProjectCalculationSnapshot({
      projectId: req.params.id,
      releasedById: req.user.id
    });
    return res.status(created ? 201 : 200).json({
      snapshot: presentCalculationSnapshot(snapshot),
      created
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.code || "SNAPSHOT_RELEASE_FAILED",
        message: error.message
      });
    }
    throw error;
  }
}

export async function getCalculationSnapshots(_req, res) {
  const snapshots = await listReleasedCalculationSnapshots();
  return res.json({ snapshots: snapshots.map(presentCalculationSnapshot) });
}

export async function createManualSnapshot(req, res) {
  try {
    const snapshot = await createManualCalculationSnapshot({
      input: req.body,
      releasedById: req.user.id
    });
    return res.status(201).json({ snapshot: presentCalculationSnapshot(snapshot) });
  } catch (error) {
    return manualSnapshotError(res, error);
  }
}

export async function updateManualSnapshot(req, res) {
  try {
    const snapshot = await updateManualCalculationSnapshot({
      id: req.params.id,
      input: req.body,
      releasedById: req.user.id
    });
    return res.json({ snapshot: presentCalculationSnapshot(snapshot) });
  } catch (error) {
    return manualSnapshotError(res, error);
  }
}

export async function deleteManualSnapshot(req, res) {
  try {
    await deleteManualCalculationSnapshot({
      id: req.params.id,
      deletedById: req.user.id
    });
    return res.status(204).send();
  } catch (error) {
    return manualSnapshotError(res, error);
  }
}
