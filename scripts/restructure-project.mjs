import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const apply = process.argv.includes("--apply");

const exactMoves = new Map(Object.entries({
  "Frontend/src/shared/services/apiTemplates.js": "Frontend/src/shared/api/file-api.js",
  "Frontend/src/shared/services/networkClient.js": "Frontend/src/shared/api/http-client.js",
  "Frontend/src/shared/services/fileChangeClient.js": "Frontend/src/shared/api/file-change-client.js",
  "Frontend/src/shared/services/license.js": "Frontend/src/shared/api/license-api.js",
  "Frontend/src/shared/services/cacheEvents.js": "Frontend/src/shared/cache/cache-events.js",
  "Frontend/src/shared/services/globalIndexDb.js": "Frontend/src/shared/cache/indexed-db.js",
  "Frontend/src/shared/services/globalMemoryCache.js": "Frontend/src/shared/cache/global-cache.js",
  "Frontend/src/shared/services/projectIndexDb.js": "Frontend/src/shared/cache/project-indexed-db.js",
  "Frontend/src/shared/services/projectMemoryCache.js": "Frontend/src/shared/cache/project-cache.js",
  "Frontend/src/shared/services/projectAssetCache.js": "Frontend/src/shared/cache/project-asset-cache.js",
  "Frontend/src/shared/services/s3CacheRefresh.js": "Frontend/src/shared/cache/cache-refresh.js",
  "Frontend/src/shared/services/offlineErrors.js": "Frontend/src/shared/offline/offline-errors.js",
  "Frontend/src/shared/services/offlineRepository.js": "Frontend/src/shared/offline/offline-repository.js",
  "Frontend/src/shared/services/offlineStatus.js": "Frontend/src/shared/offline/offline-status.js",
  "Frontend/src/shared/services/threeWayMerge.js": "Frontend/src/shared/offline/three-way-merge.js",
  "Frontend/src/shared/services/companySettings.js": "Frontend/src/shared/settings/company-settings.js",
  "Frontend/src/shared/services/uuid.js": "Frontend/src/shared/utils/uuid.js",

  "Frontend/src/features/contacts/contacts.admin.jsx": "Frontend/src/features/customers/pages/CustomersPage.jsx",
  "Frontend/src/features/contacts/newcontact.admin.jsx": "Frontend/src/features/customers/pages/NewCustomerPage.jsx",
  "Frontend/src/features/contacts/showcontact.admin.jsx": "Frontend/src/features/customers/pages/CustomerDetailsPage.jsx",
  "Frontend/src/features/contacts/editcontact.admin.jsx": "Frontend/src/features/customers/pages/EditCustomerPage.jsx",
  "Frontend/src/features/contacts/newproject.admin.jsx": "Frontend/src/features/customers/pages/NewCustomerProjectPage.jsx",
  "Frontend/src/features/settings/userProfile.jsx": "Frontend/src/features/user-profile/UserProfilePage.jsx",
  "Frontend/src/features/settings/companySettings.jsx": "Frontend/src/features/company-settings/CompanySettingsPage.jsx",

  "Frontend/src/features/projects/attachments/attachments.project.jsx": "Frontend/src/features/projects/attachments/ProjectAttachmentsPage.jsx",
  "Frontend/src/features/projects/aufmas/aufmas.project.jsx": "Frontend/src/features/projects/measurement/MeasurementPage.jsx",
  "Frontend/src/features/projects/cabinetConfigurator/cabinetEditor.jsx": "Frontend/src/features/projects/cabinet/CabinetEditorPage.jsx",
  "Frontend/src/features/projects/calculation/CalculationView.jsx": "Frontend/src/features/projects/calculation/CalculationPage.jsx",
  "Frontend/src/features/projects/cnc/cncEditor.jsx": "Frontend/src/features/projects/cnc/CncEditorPage.jsx",
  "Frontend/src/features/projects/cut/cut.project.jsx": "Frontend/src/features/projects/cutting/CuttingPage.jsx",
  "Frontend/src/features/projects/edit/create.project.jsx": "Frontend/src/features/projects/legacy-editor/LegacyProjectEditorPage.jsx",
  "Frontend/src/features/projects/home.project.jsx": "Frontend/src/features/projects/ProjectHomePage.jsx",
  "Frontend/src/features/projects/list/list.project.jsx": "Frontend/src/features/projects/part-list/PartListPage.jsx",
  "Frontend/src/features/projects/nesting/nesting.project.jsx": "Frontend/src/features/projects/nesting/NestingPage.jsx",
  "Frontend/src/features/projects/overview.project.jsx": "Frontend/src/features/projects/ProjectOverviewPage.jsx",
  "Frontend/src/features/projects/purchasing/purchasing.project.jsx": "Frontend/src/features/projects/purchasing/ProjectPurchasingPage.jsx",
  "Frontend/src/features/projects/settings/settings.project.jsx": "Frontend/src/features/projects/settings/ProjectSettingsPage.jsx",
  "Frontend/src/features/projects/timetracking/timeTracking.project.jsx": "Frontend/src/features/projects/time-tracking/TimeTrackingPage.jsx",

  "Engine/index.js": "Engine/src/index.js",
  "Frontend/src/routes/AuthContext.jsx": "Frontend/src/app/providers/AuthProvider.jsx",
  "Frontend/src/pages/public/Login.jsx": "Frontend/src/features/auth/pages/LoginPage.jsx",
  "Frontend/src/pages/app/home.admin.jsx": "Frontend/src/features/dashboard/pages/DashboardPage.jsx",
  "Frontend/src/pages/projects/nesting/edgeRequirements.js": "Engine/src/nesting/edge-requirements.js",
  "Frontend/src/pages/purchasing/procurementUtils.js": "Engine/src/procurement/procurement.js",

  "Backend/src/config/prisma.js": "Backend/src/infrastructure/database/prisma.js",
  "Backend/src/config/s3.js": "Backend/src/infrastructure/storage/s3.js",
  "Backend/src/context/tenantContext.js": "Backend/src/infrastructure/database/tenant-context.js",
  "Backend/src/utils/logger.js": "Backend/src/infrastructure/logging/logger.js",
  "Backend/src/utils/jwt.js": "Backend/src/shared/security/jwt.js",
  "Backend/src/utils/passwords.js": "Backend/src/shared/security/passwords.js",

  "Backend/src/controllers/auth.controller.js": "Backend/src/modules/auth/auth.controller.js",
  "Backend/src/routes/auth.routes.js": "Backend/src/modules/auth/auth.routes.js",
  "Backend/src/services/auth.service.js": "Backend/src/modules/auth/auth.service.js",

  "Backend/src/controllers/customer.controller.js": "Backend/src/modules/customers/customer.controller.js",
  "Backend/src/routes/customer.routes.js": "Backend/src/modules/customers/customer.routes.js",

  "Backend/src/controllers/project.controller.js": "Backend/src/modules/projects/project.controller.js",
  "Backend/src/controllers/projectArchive.controller.js": "Backend/src/modules/projects/project-archive.controller.js",
  "Backend/src/routes/project.routes.js": "Backend/src/modules/projects/project.routes.js",
  "Backend/src/services/project.service.js": "Backend/src/modules/projects/project.service.js",

  "Backend/src/controllers/file.controller.js": "Backend/src/modules/files/file.controller.js",
  "Backend/src/routes/file.routes.js": "Backend/src/modules/files/file.routes.js",
  "Backend/src/services/fileChangeEvents.service.js": "Backend/src/modules/files/file-change-events.service.js",

  "Backend/src/controllers/attachmentSearch.controller.js": "Backend/src/modules/attachment-search/attachment-search.controller.js",
  "Backend/src/controllers/aiCredential.controller.js": "Backend/src/modules/attachment-search/attachment-credential.controller.js",
  "Backend/src/services/attachmentSearch.service.js": "Backend/src/modules/attachment-search/attachment-search.service.js",
  "Backend/src/services/tenantSecrets.service.js": "Backend/src/modules/attachment-search/tenant-secrets.service.js",

  "Backend/src/controllers/calculation.controller.js": "Backend/src/modules/calculation/calculation.controller.js",
  "Backend/src/controllers/calculationSnapshot.controller.js": "Backend/src/modules/calculation/calculation-snapshot.controller.js",
  "Backend/src/services/calculationSnapshots.service.js": "Backend/src/modules/calculation/calculation-snapshots.service.js",

  "Backend/src/controllers/license.controller.js": "Backend/src/modules/licensing/license.controller.js",
  "Backend/src/routes/license.routes.js": "Backend/src/modules/licensing/license.routes.js",

  "Backend/src/controllers/settings.controller.js": "Backend/src/modules/settings/settings.controller.js",
  "Backend/src/routes/settings.routes.js": "Backend/src/modules/settings/settings.routes.js",

  "Backend/src/controllers/shop.controller.js": "Backend/src/modules/purchasing/shop.controller.js",
  "Backend/src/routes/shop.routes.js": "Backend/src/modules/purchasing/shop.routes.js",

  "Backend/src/controllers/storage.controller.js": "Backend/src/modules/inventory/storage.controller.js",
  "Backend/src/routes/storage.routes.js": "Backend/src/modules/inventory/storage.routes.js",

  "Backend/src/controllers/time.controller.js": "Backend/src/modules/time-tracking/time.controller.js",
  "Backend/src/routes/time.routes.js": "Backend/src/modules/time-tracking/time.routes.js",

  "Backend/src/controllers/user.controller.js": "Backend/src/modules/users/user.controller.js",
  "Backend/src/routes/user.routes.js": "Backend/src/modules/users/user.routes.js",
  "Backend/src/services/user.service.js": "Backend/src/modules/users/user.service.js",

  "Backend/src/services/tenantBootstrap.service.js": "Backend/src/modules/tenants/tenant-bootstrap.service.js",
  "Backend/src/services/storage.service.js": "Backend/src/infrastructure/storage/storage.service.js",
  "Backend/src/services/storageDeletion.service.js": "Backend/src/infrastructure/storage/storage-deletion.service.js"
}));

const prefixMoves = [
  ["Frontend/src/features/projects/aufmas/", "Frontend/src/features/projects/measurement/"],
  ["Frontend/src/features/projects/cabinetConfigurator/", "Frontend/src/features/projects/cabinet/"],
  ["Frontend/src/features/projects/cut/", "Frontend/src/features/projects/cutting/"],
  ["Frontend/src/features/projects/edit/", "Frontend/src/features/projects/legacy-editor/"],
  ["Frontend/src/features/projects/list/", "Frontend/src/features/projects/part-list/"],
  ["Frontend/src/features/projects/timetracking/", "Frontend/src/features/projects/time-tracking/"],
  ["Frontend/src/features/personal/", "Frontend/src/features/employees/"],
  ["Frontend/src/features/storage/", "Frontend/src/features/inventory/"],
  ["Frontend/src/features/settings/", "Frontend/src/features/company-settings/"],
  ["Frontend/src/pages/projects/nesting/algorythm/", "Engine/src/nesting/"],
  ["Engine/cabinetConfigurator/", "Engine/src/cabinet/"],
  ["Engine/calculation/", "Engine/src/calculation/"],
  ["Engine/cnc/", "Engine/src/cnc/"],
  ["Engine/management/", "Engine/src/management/"],
  ["Engine/utils/", "Engine/src/shared/"],
  ["Engine/projectPDF/", "Engine/browser/project-pdf/"],

  ["Backend/src/controllers/management/", "Backend/src/modules/management/controllers/"],
  ["Backend/src/routes/management/", "Backend/src/modules/management/"],
  ["Backend/src/services/management/", "Backend/src/modules/management/services/"],
  ["Backend/src/services/license/", "Backend/src/modules/licensing/services/"],

  ["Frontend/src/pages/", "Frontend/src/features/"],
  ["Frontend/src/components/", "Frontend/src/shared/components/"],
  ["Frontend/src/hooks/", "Frontend/src/shared/hooks/"],
  ["Frontend/src/services/", "Frontend/src/shared/services/"],
  ["Frontend/src/routes/", "Frontend/src/app/routing/"]
];

const normalize = value => value.split(path.sep).join("/");
const absolute = relative => path.join(root, relative);

function destination(relative) {
  const normalized = normalize(relative);
  let mapped = exactMoves.get(normalized) ?? normalized;
  for (const [source, target] of prefixMoves) {
    if (!exactMoves.has(normalized) && normalized.startsWith(source)) {
      mapped = `${target}${normalized.slice(source.length)}`;
      break;
    }
  }
  if (mapped.startsWith("Frontend/src/features/")) {
    mapped = mapped.replace(/\.(?:project|admin|management|personal|storage)(?=\.(?:js|jsx)$)/, "");
  }
  return mapped;
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "EACCES") return [];
    throw error;
  }
  return entries.flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") return [];
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

const files = ["Backend", "Frontend", "Engine"]
  .flatMap(directory => walk(absolute(directory)))
  .map(file => normalize(path.relative(root, file)))
  .filter(file => !file.startsWith("scripts/restructure-project.mjs"));
const existing = new Set(files);

function resolveSource(importer, specifier) {
  let base;
  if (specifier === "@Engine") base = "Engine/index.js";
  else if (specifier.startsWith("@Engine/")) base = `Engine/${specifier.slice("@Engine/".length)}`;
  else if (specifier.startsWith(".")) base = normalize(path.join(path.dirname(importer), specifier));
  else return null;

  const candidates = [base, `${base}.js`, `${base}.jsx`, `${base}.mjs`, `${base}/index.js`, `${base}/index.mjs`]
    .map(normalize);
  return candidates.find(candidate => existing.has(candidate)) ?? null;
}

function destinationSpecifier(importerDestination, targetDestination) {
  if (importerDestination.startsWith("Frontend/") && targetDestination.startsWith("Engine/src/")) {
    return `@Engine/${targetDestination.slice("Engine/src/".length)}`;
  }
  if (importerDestination.startsWith("Frontend/") && targetDestination.startsWith("Engine/browser/")) {
    return `@EngineBrowser/${targetDestination.slice("Engine/browser/".length)}`;
  }

  let relative = normalize(path.relative(path.dirname(importerDestination), targetDestination));
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative;
}

const codeExtensions = new Set([".js", ".jsx", ".mjs"]);
const importPattern = /((?:from\s*|import\s*\()\s*["'])([^"']+)(["'])/g;
const moves = files
  .map(source => ({ source, target: destination(source) }))
  .filter(({ source, target }) => source !== target);

const collisions = moves.filter(({ target }, index) => moves.findIndex(move => move.target === target) !== index);
if (collisions.length) throw new Error(`Target collisions:\n${collisions.map(item => item.target).join("\n")}`);

console.log(`${apply ? "Applying" : "Planning"} ${moves.length} file moves`);
for (const { source, target } of moves) console.log(`${source} -> ${target}`);

if (!apply) process.exit(0);

const rewritten = new Map();
for (const file of files) {
  if (!codeExtensions.has(path.extname(file))) continue;
  const importerDestination = destination(file);
  const sourceText = fs.readFileSync(absolute(file), "utf8");
  const nextText = sourceText.replace(importPattern, (match, prefix, specifier, quote) => {
    const resolved = resolveSource(file, specifier);
    if (!resolved) return match;
    const nextSpecifier = destinationSpecifier(importerDestination, destination(resolved));
    return `${prefix}${nextSpecifier}${quote}`;
  });
  rewritten.set(file, nextText);
}

for (const { target } of moves) fs.mkdirSync(path.dirname(absolute(target)), { recursive: true });
for (const { source, target } of moves) fs.renameSync(absolute(source), absolute(target));

for (const [source, content] of rewritten) {
  fs.writeFileSync(absolute(destination(source)), content);
}

const cleanupRoots = [
  "Frontend/src/pages",
  "Frontend/src/components",
  "Frontend/src/hooks",
  "Frontend/src/services",
  "Frontend/src/routes",
  "Backend/src/controllers",
  "Backend/src/routes",
  "Backend/src/services",
  "Backend/src/context",
  "Backend/src/utils",
  "Engine/cabinetConfigurator",
  "Engine/calculation",
  "Engine/cnc",
  "Engine/management",
  "Engine/utils",
  "Engine/projectPDF"
];
for (const directory of cleanupRoots) {
  const fullPath = absolute(directory);
  if (fs.existsSync(fullPath) && walk(fullPath).length === 0) fs.rmSync(fullPath, { recursive: true });
}

console.log("Restructure complete");
