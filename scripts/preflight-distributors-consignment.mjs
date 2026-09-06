#!/usr/bin/env node
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PAGE_SIZE = 500;
const WRITE_BATCH_SIZE = 450;
const SAMPLE_SIZE = 10;
const CURRENT_SYNC_PATH = "metrc_syncs/current";

function usage() {
  return [
    "Usage: node --env-file=/etc/grc-crm.env scripts/preflight-distributors-consignment.mjs [--json] [--apply]",
    "",
    "Company-backed distributor consignment preflight and migration tool.",
    "Runs in dry-run mode by default and performs no writes unless --apply is provided.",
    "Matches old distributors to Active Distributor Companies only by exact normalized license_number.",
    "Does not delete old distributors collection data.",
    "",
    "Options:",
    "  --json    Print the raw audit result as JSON instead of a formatted report.",
    "  --apply   Apply active package consignment ID/name updates for matched distributors.",
    "  --help    Show this message.",
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
      visit(doc.id, doc.data() ?? {}, doc.ref);
      scanned += 1;
    }

    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < PAGE_SIZE) {
      return scanned;
    }
  }
}

function normalizedText(value) {
  return String(value ?? "").trim();
}

function normalizedLicenseNumber(value) {
  return normalizedText(value).replace(/\s+/g, " ").toUpperCase();
}

function sample(values) {
  return values.slice(0, SAMPLE_SIZE);
}

function groupBy(values, getKey) {
  const groups = new Map();
  for (const value of values) {
    const key = getKey(value);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(value);
  }
  return groups;
}

async function loadDistributors(db) {
  const distributors = [];

  await eachDocument(db, "distributors", (id, data) => {
    distributors.push({
      id,
      name: normalizedText(data.name),
      license_number: normalizedText(data.license_number),
      normalized_license_number: normalizedLicenseNumber(data.license_number),
      archived: data.archived_at !== null && data.archived_at !== undefined,
    });
  });

  return distributors;
}

async function loadCompanies(db) {
  const companies = [];

  await eachDocument(db, "companies", (id, data) => {
    companies.push({
      id,
      company_name: normalizedText(data.company_name),
      license_number: normalizedText(data.license_number),
      normalized_license_number: normalizedLicenseNumber(data.license_number),
      facility_type: normalizedText(data.facility_type),
      status: normalizedText(data.status),
    });
  });

  return companies;
}

function buildMigrationMap(distributors, companies) {
  const distributorCompanies = companies.filter((company) => company.facility_type === "Distributor" && company.status === "Active");
  const companiesByLicense = groupBy(
    distributorCompanies.filter((company) => company.normalized_license_number !== ""),
    (company) => company.normalized_license_number,
  );
  const duplicateCompanyLicenses = [...companiesByLicense.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([license, matches]) => ({
      license_number: license,
      companies: matches.map((company) => `${company.id} (${company.company_name || "missing name"})`),
    }));

  const distributorsByLicense = groupBy(
    distributors.filter((distributor) => distributor.normalized_license_number !== ""),
    (distributor) => distributor.normalized_license_number,
  );
  const duplicateDistributorLicenseEntries = [...distributorsByLicense.entries()].filter(([, matches]) => matches.length > 1);
  const duplicateDistributorLicenseNumbers = new Set(duplicateDistributorLicenseEntries.map(([license]) => license));
  const duplicateDistributorLicenses = duplicateDistributorLicenseEntries.map(([license, matches]) => ({
    license_number: license,
    distributors: matches.map((distributor) => `${distributor.id} (${distributor.name || "missing name"})`),
  }));

  const matched = [];
  const missingLicense = [];
  const unmatchedLicense = [];
  const duplicateLicenseMatches = [];

  for (const distributor of distributors) {
    if (distributor.normalized_license_number === "") {
      missingLicense.push(`${distributor.id} (${distributor.name || "missing name"})`);
      continue;
    }

    if (duplicateDistributorLicenseNumbers.has(distributor.normalized_license_number)) {
      continue;
    }

    const companyMatches = companiesByLicense.get(distributor.normalized_license_number) ?? [];
    if (companyMatches.length === 0) {
      unmatchedLicense.push(`${distributor.id} (${distributor.name || "missing name"}, license ${distributor.license_number})`);
      continue;
    }

    if (companyMatches.length > 1) {
      duplicateLicenseMatches.push({
        distributor: `${distributor.id} (${distributor.name || "missing name"}, license ${distributor.license_number})`,
        companies: companyMatches.map((company) => `${company.id} (${company.company_name || "missing name"})`),
      });
      continue;
    }

    const company = companyMatches[0];
    matched.push({
      distributor_id: distributor.id,
      distributor_name: distributor.name,
      company_id: company.id,
      company_name: company.company_name,
      license_number: distributor.normalized_license_number,
      company_status: company.status,
    });
  }

  return {
    matched,
    by_distributor_id: new Map(matched.map((match) => [match.distributor_id, match])),
    missing_license: missingLicense,
    unmatched_license: unmatchedLicense,
    duplicate_license_matches: duplicateLicenseMatches,
    duplicate_company_licenses: duplicateCompanyLicenses,
    duplicate_distributor_licenses: duplicateDistributorLicenses,
  };
}

async function auditPackages(db, companyIds, distributorIds, migrationByDistributorId) {
  const result = {
    total: 0,
    active: 0,
    inactive: 0,
    with_consignment: 0,
    active_with_consignment: 0,
    company_backed_consignment: 0,
    old_distributor_backed_consignment: 0,
    unknown_consignment_id: 0,
    active_with_last_sync_id: 0,
    active_without_last_sync_id: 0,
    proposed_active_package_updates: 0,
    unexpected_consignment_shape: [],
    unexpected_last_sync_id_type: [],
    company_backed_samples: [],
    old_distributor_backed_samples: [],
    unknown_consignment_samples: [],
    update_samples: [],
  };
  const updateCandidates = [];

  await eachDocument(db, "packages", (id, data, ref) => {
    result.total += 1;
    const isActive = data.active === true;
    if (isActive) {
      result.active += 1;
    } else {
      result.inactive += 1;
    }

    if (isActive) {
      if (typeof data.last_sync_id === "string" && data.last_sync_id !== "") {
        result.active_with_last_sync_id += 1;
      } else {
        result.active_without_last_sync_id += 1;
        if (data.last_sync_id !== undefined && data.last_sync_id !== null && typeof data.last_sync_id !== "string") {
          result.unexpected_last_sync_id_type.push(id);
        }
      }
    }

    const consignment = data.consignment;
    if (consignment === undefined || consignment === null) {
      return;
    }

    result.with_consignment += 1;
    if (isActive) {
      result.active_with_consignment += 1;
    }

    const validShape =
      typeof consignment === "object" &&
      !Array.isArray(consignment) &&
      typeof consignment.distributor_id === "string" &&
      consignment.distributor_id !== "" &&
      typeof consignment.distributor_name === "string";

    if (!validShape) {
      result.unexpected_consignment_shape.push(id);
      return;
    }

    const distributorId = consignment.distributor_id;
    if (companyIds.has(distributorId)) {
      result.company_backed_consignment += 1;
      result.company_backed_samples.push(`${id} -> ${consignment.distributor_name}`);
      return;
    }

    if (distributorIds.has(distributorId)) {
      result.old_distributor_backed_consignment += 1;
      result.old_distributor_backed_samples.push(`${id} -> ${consignment.distributor_name}`);
      const match = migrationByDistributorId.get(distributorId);
      if (isActive && match) {
        result.proposed_active_package_updates += 1;
        result.update_samples.push(`${id}: ${distributorId} -> ${match.company_id} (${match.company_name})`);
        updateCandidates.push({ ref, match });
      }
      return;
    }

    result.unknown_consignment_id += 1;
    result.unknown_consignment_samples.push(`${id} -> ${distributorId} (${consignment.distributor_name})`);
  });

  result.company_backed_samples = sample(result.company_backed_samples);
  result.old_distributor_backed_samples = sample(result.old_distributor_backed_samples);
  result.unknown_consignment_samples = sample(result.unknown_consignment_samples);
  result.update_samples = sample(result.update_samples);
  result.unexpected_consignment_shape = sample(result.unexpected_consignment_shape);
  result.unexpected_last_sync_id_type = sample(result.unexpected_last_sync_id_type);

  return { result, updateCandidates };
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

async function applyPackageUpdates(db, updateCandidates) {
  let updated = 0;

  for (let index = 0; index < updateCandidates.length; index += WRITE_BATCH_SIZE) {
    const batch = db.batch();
    const chunk = updateCandidates.slice(index, index + WRITE_BATCH_SIZE);

    for (const candidate of chunk) {
      batch.update(candidate.ref, {
        "consignment.distributor_id": candidate.match.company_id,
        "consignment.distributor_name": candidate.match.company_name,
      });
    }

    await batch.commit();
    updated += chunk.length;
  }

  return updated;
}

function summarizeDistributors(distributors) {
  return {
    total: distributors.length,
    active: distributors.filter((distributor) => !distributor.archived).length,
    archived: distributors.filter((distributor) => distributor.archived).length,
  };
}

function summarizeCompanies(companies) {
  const distributorCompanies = companies.filter((company) => company.facility_type === "Distributor");

  return {
    total: companies.length,
    distributor_companies: distributorCompanies.length,
    active_distributor_companies: distributorCompanies.filter((company) => company.status === "Active").length,
    inactive_distributor_companies: distributorCompanies.filter((company) => company.status !== "Active").length,
    missing_distributor_company_license: sample(
      distributorCompanies
        .filter((company) => company.normalized_license_number === "")
        .map((company) => `${company.id} (${company.company_name || "missing name"})`),
    ),
  };
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

function printStructuredList(label, values, format) {
  if (values.length === 0) {
    return;
  }

  console.log(`  ${label}:`);
  for (const value of values.slice(0, SAMPLE_SIZE)) {
    console.log(`    - ${format(value)}`);
  }
}

function printReport(audit) {
  const { target, mode, packages, companies, distributors, migration, currentSync, apply } = audit;

  console.log("Company-backed distributor consignment — production preflight");
  console.log(`Mode: ${mode}${mode === "dry-run" ? " (no writes performed)" : ""}`);
  console.log(`Project: ${target.project_id ?? "(unresolved)"}${target.emulator ? ` via emulator ${target.emulator}` : ""}`);
  console.log("");

  console.log("companies");
  console.log(`  total: ${companies.total}`);
  console.log(`  Distributor companies: ${companies.distributor_companies}`);
  console.log(`  Active Distributor companies: ${companies.active_distributor_companies}`);
  console.log(`  inactive/non-Active Distributor companies: ${companies.inactive_distributor_companies}`);
  printList("Distributor companies missing license_number", companies.missing_distributor_company_license);
  console.log("");

  console.log("old distributors collection");
  console.log(`  total: ${distributors.total} (active ${distributors.active}, archived ${distributors.archived})`);
  console.log("  retained for historical safety; this script does not delete it");
  console.log("");

  console.log("license-number migration map");
  console.log(`  matched old distributors to Active Distributor Companies: ${migration.matched.length}`);
  console.log(`  old distributors missing license_number: ${migration.missing_license.length}`);
  console.log(`  old distributors without an Active Distributor Company license match: ${migration.unmatched_license.length}`);
  console.log(`  old distributors with duplicate Active Distributor Company license matches: ${migration.duplicate_license_matches.length}`);
  console.log(`  duplicate Active Distributor Company license numbers: ${migration.duplicate_company_licenses.length}`);
  console.log(`  duplicate old Distributor license numbers: ${migration.duplicate_distributor_licenses.length}`);
  printList("missing old distributor license samples", sample(migration.missing_license));
  printList("unmatched old distributor license samples", sample(migration.unmatched_license));
  printStructuredList("duplicate Active Distributor Company license match samples", migration.duplicate_license_matches, (entry) => `${entry.distributor} -> ${entry.companies.join(", ")}`);
  printStructuredList("duplicate Active Distributor Company license samples", migration.duplicate_company_licenses, (entry) => `${entry.license_number}: ${entry.companies.join(", ")}`);
  printStructuredList("duplicate old Distributor license samples", migration.duplicate_distributor_licenses, (entry) => `${entry.license_number}: ${entry.distributors.join(", ")}`);
  console.log("");

  console.log("packages");
  console.log(`  total: ${packages.total} (active ${packages.active}, inactive ${packages.inactive})`);
  console.log(`  packages with consignment: ${packages.with_consignment}`);
  console.log(`  active packages with consignment: ${packages.active_with_consignment}`);
  console.log(`  consignment IDs already matching Active Distributor Company IDs: ${packages.company_backed_consignment}`);
  console.log(`  consignment IDs still matching old Distributor IDs: ${packages.old_distributor_backed_consignment}`);
  console.log(`  consignment IDs matching neither Active Distributor Companies nor old Distributors: ${packages.unknown_consignment_id}`);
  console.log(`  proposed active package updates: ${packages.proposed_active_package_updates}`);
  console.log(`  active with last_sync_id: ${packages.active_with_last_sync_id}`);
  console.log(`  active without last_sync_id: ${packages.active_without_last_sync_id}`);
  printList("Active Distributor Company-backed consignment samples", packages.company_backed_samples);
  printList("old Distributor-backed consignment samples", packages.old_distributor_backed_samples);
  printList("unknown consignment ID samples", packages.unknown_consignment_samples);
  printList("proposed update samples", packages.update_samples);
  printList("unexpected consignment shape", packages.unexpected_consignment_shape);
  printList("unexpected last_sync_id type", packages.unexpected_last_sync_id_type);
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

  console.log("Findings");
  if (mode === "apply") {
    console.log(`  - Applied ${apply.updated_package_count} active package consignment updates.`);
  } else {
    console.log("  - Dry run only. Re-run with --apply to write the proposed active package updates.");
  }
  console.log("  - Matching uses only normalized license_number; no name fallback is used.");
  console.log("  - Old distributors collection documents are left unchanged.");
  if (
    migration.missing_license.length > 0 ||
    migration.unmatched_license.length > 0 ||
    migration.duplicate_license_matches.length > 0 ||
    migration.duplicate_distributor_licenses.length > 0
  ) {
    console.log("  - Some old distributor references cannot be migrated until missing, unmatched, or duplicate license mappings are resolved.");
  }
  if (packages.unknown_consignment_id > 0) {
    console.log("  - Some package consignment IDs do not match an Active Distributor Company or old Distributor document; inspect them before applying migration.");
  }
  if (packages.unexpected_consignment_shape.length > 0 || packages.unexpected_last_sync_id_type.length > 0) {
    console.log("  - Unexpected field shapes were found on packages; inspect the sampled documents before release.");
  }
  if (currentSync.exists && !currentSync.finalized) {
    console.log("  - An unfinalized METRC sync exists; the next upload supersedes it and it can no longer be finalized.");
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    return;
  }

  const asJson = args.includes("--json");
  const apply = args.includes("--apply");
  const unknown = args.filter((arg) => !["--json", "--apply", "--help", "-h"].includes(arg));
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

  const [distributorDocs, companyDocs, currentSync] = await Promise.all([loadDistributors(db), loadCompanies(db), auditCurrentSync(db)]);
  const migrationMap = buildMigrationMap(distributorDocs, companyDocs);
  const activeDistributorCompanyIds = new Set(companyDocs
    .filter((company) => company.facility_type === "Distributor" && company.status === "Active")
    .map((company) => company.id));
  const distributorIds = new Set(distributorDocs.map((distributor) => distributor.id));
  const { result: packages, updateCandidates } = await auditPackages(db, activeDistributorCompanyIds, distributorIds, migrationMap.by_distributor_id);

  const applyResult = { updated_package_count: 0 };
  if (apply && updateCandidates.length > 0) {
    applyResult.updated_package_count = await applyPackageUpdates(db, updateCandidates);
  }

  const audit = {
    target,
    mode: apply ? "apply" : "dry-run",
    companies: summarizeCompanies(companyDocs),
    distributors: summarizeDistributors(distributorDocs),
    migration: {
      matched: migrationMap.matched,
      missing_license: migrationMap.missing_license,
      unmatched_license: migrationMap.unmatched_license,
      duplicate_license_matches: migrationMap.duplicate_license_matches,
      duplicate_company_licenses: migrationMap.duplicate_company_licenses,
      duplicate_distributor_licenses: migrationMap.duplicate_distributor_licenses,
    },
    packages,
    currentSync,
    apply: applyResult,
  };

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
