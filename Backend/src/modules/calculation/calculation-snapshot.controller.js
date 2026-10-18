import {
  listReleasedCalculationSnapshots,
  presentCalculationSnapshot,
  releaseProjectCalculationSnapshot
} from "./calculation-snapshots.service.js";

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
