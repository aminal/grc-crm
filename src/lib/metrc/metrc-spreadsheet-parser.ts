import * as XLSX from "xlsx";
import type { ParsedPackageData } from "@/lib/domain/types";

const COLUMN_ALIASES: Record<keyof ParsedPackageData, string[]> = {
  package_tag: ["packagetag", "tag", "packagelabel", "label"],
  strain: ["strain", "strainname", "itemstrain"],
  source_harvest: ["sourceharvest", "sourceharvests", "sourceharvestname", "sourceharvestnames", "harvest"],
  source_packages: ["sourcepackage", "sourcepackages"],
  original_source_package_label: ["originalsourcepackagelabel", "originalsourcepackage"],
  source_processing_jobs: ["sourceprocessingjob", "sourceprocessingjobs"],
  location: ["location", "locationname"],
  sublocation: ["sublocation", "sublocationname"],
  item: ["item", "itemname", "product"],
  category: ["category", "productcategory", "itemcategory"],
  quantity: ["quantity", "qty"],
  unit_of_measure: ["unitofmeasure", "uom", "unit"],
  production_batch_number: ["productionbatchnumber", "productionbatch"],
  source_production_batch: ["sourceproductionbatch", "sourceproductionbatchnumber"],
  lab_testing_status: ["labtestingstatus", "labteststatus", "labtestingstate", "testingstatus"],
  finished_goods: ["finishedgoods", "finishedgood"],
  administrative_hold: ["administrativehold", "adminhold"],
  administrative_recall: ["administrativerecall", "adminrecall"],
  packaged_date: ["packageddate", "packagedon"],
  received: ["received", "receiveddate"],
  expiration_date: ["expirationdate", "expires", "expirydate"],
  sell_by_date: ["sellbydate", "sellby"],
  lab_test_expiration: ["labtestexpiration", "labtestexpiry"],
};

const DATE_FIELDS = new Set<keyof ParsedPackageData>([
  "packaged_date",
  "received",
  "expiration_date",
  "sell_by_date",
  "lab_test_expiration",
]);

const PACKAGE_DEFAULTS: ParsedPackageData = {
  package_tag: "",
  strain: "",
  source_harvest: "",
  source_packages: "",
  original_source_package_label: "",
  source_processing_jobs: "",
  location: "",
  sublocation: "",
  item: "",
  category: "",
  quantity: 0,
  unit_of_measure: "",
  production_batch_number: "",
  source_production_batch: "",
  lab_testing_status: "",
  finished_goods: "",
  administrative_hold: "",
  administrative_recall: "",
  packaged_date: "",
  received: "",
  expiration_date: "",
  sell_by_date: "",
  lab_test_expiration: "",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/gi, "");
}

function mapColumns(header: unknown[]): Partial<Record<keyof ParsedPackageData, number>> {
  const map: Partial<Record<keyof ParsedPackageData, number>> = {};

  header.forEach((label, index) => {
    const normalized = normalizeHeader(label);
    if (!normalized) {
      return;
    }

    for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [keyof ParsedPackageData, string[]][]) {
      if (map[field] === undefined && aliases.includes(normalized)) {
        map[field] = index;
      }
    }
  });

  return map;
}

function toFloat(value: unknown): number {
  const clean = String(value ?? "").replace(/[^0-9.-]/g, "");
  return clean ? Number(clean) : 0;
}

function toIsoDate(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      return String(value);
    }

    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, Math.floor(parsed.S))).toISOString();
  }

  return String(value).trim();
}

function cell(row: unknown[], columnMap: Partial<Record<keyof ParsedPackageData, number>>, field: keyof ParsedPackageData): unknown {
  const index = columnMap[field];
  return index === undefined ? "" : row[index];
}

function actualSheetRange(sheet: XLSX.WorkSheet): string | null {
  const cells = Object.keys(sheet).filter((key) => /^[A-Z]+[0-9]+$/.test(key));
  if (cells.length === 0) {
    return null;
  }

  const range = cells.reduce(
    (current, address) => {
      const cellAddress = XLSX.utils.decode_cell(address);
      return {
        s: {
          r: Math.min(current.s.r, cellAddress.r),
          c: Math.min(current.s.c, cellAddress.c),
        },
        e: {
          r: Math.max(current.e.r, cellAddress.r),
          c: Math.max(current.e.c, cellAddress.c),
        },
      };
    },
    { s: { r: Number.POSITIVE_INFINITY, c: Number.POSITIVE_INFINITY }, e: { r: 0, c: 0 } },
  );

  return XLSX.utils.encode_range(range);
}

export function parseMetrcWorkbook(buffer: Buffer | ArrayBuffer | Uint8Array): ParsedPackageData[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return [];
  }

  const range = actualSheetRange(sheet);
  if (!range) {
    return [];
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false, range });
  const header = rows.shift();
  if (!header) {
    return [];
  }

  const columnMap = mapColumns(header);
  if (columnMap.package_tag === undefined) {
    throw new Error('Could not locate a "Package Tag" column in the METRC export.');
  }

  const packages: ParsedPackageData[] = [];
  for (const row of rows) {
    const tag = String(cell(row, columnMap, "package_tag") ?? "").trim();
    if (!tag) {
      continue;
    }

    const parsed: ParsedPackageData = { ...PACKAGE_DEFAULTS, package_tag: tag };
    for (const field of Object.keys(COLUMN_ALIASES) as (keyof ParsedPackageData)[]) {
      if (field === "package_tag") {
        continue;
      }

      const value = cell(row, columnMap, field);
      if (field === "quantity") {
        parsed.quantity = toFloat(value);
      } else if (DATE_FIELDS.has(field)) {
        parsed[field] = toIsoDate(value) as never;
      } else {
        parsed[field] = String(value ?? "").trim() as never;
      }
    }

    packages.push(parsed);
  }

  return packages;
}
