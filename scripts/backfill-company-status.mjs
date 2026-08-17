#!/usr/bin/env node

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const COMPANY_STATUSES = [
  "Lead",
  "Pending",
  "Active",
  "Active - COD Only",
  "On Hold - Financial",
  "On Hold - Compliance",
  "Inactive",
  "Blacklisted",
];

const BATCH_SIZE = 450;

function privateKey(value) {
  return value ? value.replace(/\\n/g, "\n") : undefined;
}

function printUsage() {
  console.log(`Usage: node scripts/backfill-company-status.mjs --status "Lead" [--dry-run | --write]

Options:
  --status <value>   Required. One of: ${COMPANY_STATUSES.join(", ")}
  --dry-run          Scan and report only. This is the default.
  --write            Update invalid or missing statuses.
  --help             Show this help message.`);
}

function parseArgs(argv) {
  const parsed = {
    dryRun: false,
    help: false,
    status: undefined,
    write: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }

    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }

    if (arg === "--write") {
      parsed.write = true;
      continue;
    }

    if (arg === "--status") {
      parsed.status = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--status=")) {
      parsed.status = arg.slice("--status=".length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (parsed.help) {
    return parsed;
  }

  if (!parsed.status) {
    throw new Error("Missing required --status argument.");
  }

  if (!COMPANY_STATUSES.includes(parsed.status)) {
    throw new Error(`Invalid --status value. Allowed values: ${COMPANY_STATUSES.join(", ")}.`);
  }

  if (parsed.write && parsed.dryRun) {
    throw new Error("Choose either --dry-run or --write, not both.");
  }

  parsed.dryRun = !parsed.write;

  return parsed;
}

function validateEnv() {
  const hasPartialServiceAccount = Boolean(process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_PRIVATE_KEY);
  const hasFullServiceAccount = Boolean(
    process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY,
  );

  if (hasPartialServiceAccount && !hasFullServiceAccount) {
    throw new Error("FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY must be provided together.");
  }

  if (process.env.FIREBASE_USE_EMULATORS === "true" && !process.env.FIRESTORE_EMULATOR_HOST?.trim()) {
    throw new Error("FIREBASE_USE_EMULATORS=true requires FIRESTORE_EMULATOR_HOST to be configured.");
  }

  if (process.env.FIREBASE_USE_EMULATORS !== "true" && process.env.FIRESTORE_EMULATOR_HOST?.trim()) {
    throw new Error("FIRESTORE_EMULATOR_HOST should be empty unless FIREBASE_USE_EMULATORS=true.");
  }
}

function initAdminApp() {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  validateEnv();

  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const key = privateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (projectId && process.env.FIREBASE_CLIENT_EMAIL && key) {
    return initializeApp({
      credential: cert({ projectId, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: key }),
      projectId,
      storageBucket,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId,
    storageBucket,
  });
}

function isValidStatus(value) {
  return typeof value === "string" && COMPANY_STATUSES.includes(value);
}

function shouldBackfill(value) {
  return typeof value !== "string" || value.trim() === "" || !isValidStatus(value);
}

async function commitBatch(batch, pendingWrites) {
  if (pendingWrites === 0) {
    return;
  }

  await batch.commit();
}

async function backfillCompanyStatuses({ dryRun, status }) {
  const app = initAdminApp();
  const db = getFirestore(app);
  const snapshot = await db.collection("companies").get();
  const stats = {
    scanned: 0,
    valid: 0,
    invalid: 0,
    updated: 0,
    skipped: 0,
  };

  let batch = db.batch();
  let pendingWrites = 0;

  for (const doc of snapshot.docs) {
    stats.scanned += 1;

    const currentStatus = doc.get("status");
    if (!shouldBackfill(currentStatus)) {
      stats.valid += 1;
      continue;
    }

    stats.invalid += 1;

    if (dryRun) {
      stats.skipped += 1;
      continue;
    }

    batch.update(doc.ref, { status });
    pendingWrites += 1;
    stats.updated += 1;

    if (pendingWrites >= BATCH_SIZE) {
      await commitBatch(batch, pendingWrites);
      batch = db.batch();
      pendingWrites = 0;
    }
  }

  if (!dryRun) {
    await commitBatch(batch, pendingWrites);
  }

  return stats;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  console.log(`Company status backfill ${options.dryRun ? "dry run" : "write mode"}`);
  console.log(`Target status: ${options.status}`);

  const stats = await backfillCompanyStatuses(options);

  console.log("Backfill complete.");
  console.log(`Scanned: ${stats.scanned}`);
  console.log(`Valid: ${stats.valid}`);
  console.log(`Invalid/missing: ${stats.invalid}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Skipped: ${stats.skipped}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
