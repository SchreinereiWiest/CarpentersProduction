-- Frühere Klartext-Händlerkonfigurationen werden entfernt. DATANORM benötigt
-- keine Zugangsdaten; Häfele authentifiziert ausschließlich im Firefox-Profil.
ALTER TABLE "suppliers" DROP COLUMN "procurement_config";

