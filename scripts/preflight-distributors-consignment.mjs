#!/usr/bin/env node
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PAGE_SIZE = 500;
const SAMPLE_SIZE = 10;
const CURRENT_SYNC_PATH = "metrc_syncs/current";
const WRITE_ROLES = ["Admin", "Manager"];

function usage() {
  return [
    "Usage: node --env-file=/etc/grc-crm.env scripts/preflight-distributors-consignment.mjs [--json]",
    "",
    "Read-only release preflight for the Distributors & Package Consignment change.",
    "Performs no writes of any kind and is safe to run repeatedly against production.",
    "",
    "Options:",
    "  --json   Print the raw audit result as JSON instead of a formatted report.",
    "  --help   Show this message.",
  ].join("\n");
}

function privateKey(value) {
  return value ? value.replace(/\\n/g, "\n") : undefined;
}

function initAdminApp() {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const key = privateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (projectId && clientEmail && key) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key }), projectId });
  }

  return initializeApp({ credential: applicationDefault(), projectId });
}

async function eachDocument(db, collectionPath, visit) {
  let cursor = null;
  let scanned = 0;

  for (;;) {
    let query = db.collection(collectionPath).orderBy("__name__").limit(PAGE_SIZE);
    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      return scanned;
    }

    for (const doc of snapshot.docs) {
      visit(doc.id, doc.data() ?? {});
      scanned += 1;
    }

    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < PAGE_SIZE) {
      return scanned;
    }
  }
}

function sample(values) {
  return values.slice(0, SAMPLE_SIZE);
}

async function auditPackages(db) {
  const result = {
    total: 0,
    active: 0,
    inactive: 0,
    active_with_consignment: 0,
    active_with_last_sync_id: 0,
    active_without_last_sync_id: 0,
    unexpected_consignment_shape: [],
    unexpected_last_sync_id_type: [],
    consigned_samples: [],
  };

  await eachDocument(db, "packages", (id, data) => {
    result.total += 1;
    const isActive = data.active === true;
    if (!isActive) {
      result.inactive += 1;
      return;
    }

    result.active += 1;

    if (typeof data.last_sync_id === "string" && data.last_sync_id !== "") {
      result.active_with_last_sync_id += 1;
    } else {
      result.active_without_last_sync_id += 1;
      if (data.last_sync_id !== undefined && data.last_sync_id !== null && typeof data.last_sync_id !== "string") {
        result.unexpected_last_sync_id_type.push(id);
      }
    }

    const consignment = data.consignment;
    if (consignment === undefined || consignment === null) {
      return;
    }

    result.active_with_consignment += 1;
    const validShape =
      typeof consignment === "object" &&
      !Array.isArray(consignment) &&
      typeof consignment.distributor_id === "string" &&
      consignment.distributor_id !== "" &&
      typeof consignment.distributor_name === "string";

    if (validShape) {
      result.consigned_samples.push(`${id} -> ${consignment.distributor_name}`);
    } else {
      result.unexpected_consignment_shape.push(id);
    }
  });

  result.consigned_samples = sample(result.consigned_samples);
  result.unexpected_consignment_shape = sample(result.unexpected_consignment_shape);
  result.unexpected_last_sync_id_type = sample(result.unexpected_last_sync_id_type);
  return result;
}

async function auditDistributors(db) {
  const result = { total: 0, active: 0, archived: 0, missing_name: [] };

  await eachDocument(db, "distributors", (id, data) => {
    result.total += 1;
    if (data.archived_at) {
      result.archived += 1;
    } else {
      result.active += 1;
    }

    if (typeof data.name !== "string" || data.name.trim() === "") {
      result.missing_name.push(id);
    }
  });

  result.missing_name = sample(result.missing_name);
  return result;
}

async function auditCurrentSync(db) {
  const snapshot = await db.doc(CURRENT_SYNC_PATH).get();
  if (!snapshot.exists) {
    return { exists: false };
  }

  const data = snapshot.data() ?? {};
  return {
    exists: true,
    sync_id: typeof data.sync_id === "string" ? data.sync_id : null,
    finalized: Boolean(data.finalized_at),
    started_by: data.started_by?.email ?? null,
  };
}

function storedSection(permissions, section) {
  if (typeof permissions !== "object" || permissions === null || Array.isArray(permissions)) {
    return null;
  }

  return permissions[section] ?? null;
}

function sectionIsRestricted(stored) {
  if (typeof stored === "string") {
    return stored !== "write";
  }

  if (typeof stored !== "object" || stored === null || Array.isArray(stored)) {
    return false;
  }

  if (stored.enabled === false) {
    return true;
  }

  const features = stored.features;
  if (typeof features !== "object" || features === null) {
    return false;
  }

  return Object.values(features).some((value) => value === false);
}

async function auditUsers(db) {
  const result = {
    total: 0,
    by_role: {},
    missing_distributors_key: 0,
    missing_manage_consignment_key: 0,
    review_distributors_default: [],
    review_manage_consignment_default: [],
  };

  await eachDocument(db, "users", (id, data) => {
    result.total += 1;
    const role = typeof data.role === "string" ? data.role : "unknown";
    result.by_role[role] = (result.by_role[role] ?? 0) + 1;

    const label = typeof data.email === "string" && data.email !== "" ? data.email : id;
    const permissions = data.permissions;
    const distributors = storedSection(permissions, "distributors");
    const inventory = storedSection(permissions, "inventory");
    const inventoryFeatures = typeof inventory === "object" && inventory !== null ? inventory.features : null;
    const hasManageConsignment = typeof inventoryFeatures === "object" && inventoryFeatures !== null && "manage_consignment" in inventoryFeatures;

    if (!distributors) {
      result.missing_distributors_key += 1;
    }

    if (!hasManageConsignment) {
      result.missing_manage_consignment_key += 1;
    }

    if (role === "Guest") {
      return;
    }

    const catalogRestricted = ["brands", "strains", "products"].some((section) => sectionIsRestricted(storedSection(permissions, section)));
    if (!distributors && catalogRestricted) {
      result.review_distributors_default.push(`${label} (${role})`);
    }

    if (!hasManageConsignment && WRITE_ROLES.includes(role) && sectionIsRestricted(inventory)) {
      result.review_manage_consignment_default.push(`${label} (${role})`);
    }
  });

  result.review_distributors_default = sample(result.review_distributors_default);
  result.review_manage_consignment_default = sample(result.review_manage_consignment_default);
  return result;
}

function printList(label, values) {
  if (values.length === 0) {
    return;
  }

  console.log(`  ${label}:`);
  for (const value of values) {
    console.log(`    - ${value}`);
  }
}

function printReport(audit) {
  const { target, packages, distributors, currentSync, users } = audit;

  console.log("Distributors & Package Consignment — production preflight");
  console.log("Mode: read-only (no writes performed)");
  console.log(`Project: ${target.project_id ?? "(unresolved)"}${target.emulator ? ` via emulator ${target.emulator}` : ""}`);
  console.log("");

  console.log("packages");
  console.log(`  total: ${packages.total} (active ${packages.active}, inactive ${packages.inactive})`);
  console.log(`  active with last_sync_id: ${packages.active_with_last_sync_id}`);
  console.log(`  active without last_sync_id: ${packages.active_without_last_sync_id}`);
  console.log(`  active already marked consignment: ${packages.active_with_consignment}`);
  printList("consigned samples", packages.consigned_samples);
  printList("unexpected consignment shape", packages.unexpected_consignment_shape);
  printList("unexpected last_sync_id type", packages.unexpected_last_sync_id_type);
  console.log("");

  console.log("distributors");
  console.log(`  total: ${distributors.total} (active ${distributors.active}, archived ${distributors.archived})`);
  printList("missing name", distributors.missing_name);
  console.log("");

  console.log(`${CURRENT_SYNC_PATH}`);
  if (!currentSync.exists) {
    console.log("  not present — the next METRC upload will create it");
  } else {
    console.log(`  sync_id: ${currentSync.sync_id ?? "(missing)"}`);
    console.log(`  finalized: ${currentSync.finalized ? "yes" : "no"}`);
    console.log(`  started_by: ${currentSync.started_by ?? "(unknown)"}`);
  }
  console.log("");

  console.log("users");
  console.log(`  total: ${users.total}`);
  for (const [role, count] of Object.entries(users.by_role).sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${role}: ${count}`);
  }
  console.log(`  without a stored distributors section (will inherit the role default): ${users.missing_distributors_key}`);
  console.log(`  without a stored inventory.manage_consignment flag (will inherit the role default): ${users.missing_manage_consignment_key}`);
  printList("review distributors default — catalog access is restricted today", users.review_distributors_default);
  printList("review manage_consignment default — inventory access is restricted today", users.review_manage_consignment_default);
  console.log("");

  console.log("Findings");
  console.log("  - No Firestore data migration is required. consignment and last_sync_id are optional package");
  console.log("    fields, and distributors / metrc_syncs are created on first write.");
  if (packages.unexpected_consignment_shape.length > 0 || packages.unexpected_last_sync_id_type.length > 0) {
    console.log("  - Unexpected field shapes were found on packages; inspect the sampled documents before release.");
  }
  if (currentSync.exists && !currentSync.finalized) {
    console.log("  - An unfinalized METRC sync exists; the next upload supersedes it and it can no longer be finalized.");
  }
  console.log(`  - First post-deploy METRC sync: up to ${packages.active} active packages are candidates for the review step;`);
  console.log("    every active package absent from that upload must be confirmed before it is deactivated.");
  if (users.review_distributors_default.length > 0 || users.review_manage_consignment_default.length > 0) {
    console.log("  - Some users with restricted access today will receive the new defaults; review them on /users.");
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    return;
  }

  const asJson = args.includes("--json");
  const unknown = args.filter((arg) => !["--json", "--help", "-h"].includes(arg));
  if (unknown.length > 0) {
    console.error(`Unknown argument(s): ${unknown.join(", ")}`);
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const app = initAdminApp();
  const db = getFirestore(app);
  const target = {
    project_id: app.options.projectId ?? null,
    emulator: process.env.FIRESTORE_EMULATOR_HOST ?? null,
  };

  const [packages, distributors, currentSync, users] = await Promise.all([
    auditPackages(db),
    auditDistributors(db),
    auditCurrentSync(db),
    auditUsers(db),
  ]);

  const audit = { target, packages, distributors, currentSync, users };
  if (asJson) {
    console.log(JSON.stringify(audit, null, 2));
    return;
  }

  printReport(audit);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
