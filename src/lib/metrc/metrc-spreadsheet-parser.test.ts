import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseMetrcWorkbook } from "./metrc-spreadsheet-parser";

function workbookBuffer(rows: unknown[][]): Buffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Active Packages");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("METRC spreadsheet parser", () => {
  it("maps basic columns and skips blank package rows", () => {
    const packages = parseMetrcWorkbook(workbookBuffer([
      ["Package Tag", "Item", "Quantity"],
      ["pkg-a", "Blue Dream", "1,234.5 g"],
      ["", "Spacer", "10"],
    ]));

    expect(packages).toHaveLength(1);
    expect(packages[0]).toMatchObject({ package_tag: "pkg-a", item: "Blue Dream", quantity: 1234.5 });
  });

  it("supports alternate aliases", () => {
    const packages = parseMetrcWorkbook(workbookBuffer([
      ["Label", "Product", "Qty", "UoM", "Expires"],
      ["pkg-a", "Pre-Roll", "10", "Each", "2026-08-01"],
    ]));

    expect(packages[0]).toMatchObject({ package_tag: "pkg-a", item: "Pre-Roll", quantity: 10, unit_of_measure: "Each", expiration_date: "2026-08-01" });
  });

  it("throws when package tag is missing", () => {
    expect(() => parseMetrcWorkbook(workbookBuffer([["Item"], ["Flower"]]))).toThrow("Package Tag");
  });

  it("parses complete active-package rows", () => {
    const packages = parseMetrcWorkbook(workbookBuffer([
      [
        "Package Tag",
        "Strain",
        "Source Harvest",
        "Source Package",
        "Original Source Package Label",
        "Source Processing Job",
        "Location",
        "Sublocation",
        "Item",
        "Category",
        "Quantity",
        "Unit Of Measure",
        "Production Batch Number",
        "Source Production Batch",
        "Lab Testing Status",
        "Finished Goods",
        "Administrative Hold",
        "Administrative Recall",
        "Packaged Date",
        "Received",
        "Expiration Date",
        "Sell-By Date",
        "Lab Test Expiration",
      ],
      [
        "pkg-full",
        "GRC Strain",
        "harvest-1",
        "source-1",
        "original-1",
        "job-1",
        "Vault",
        "Shelf A",
        "Flower 3.5g",
        "Flower",
        "12.5",
        "Each",
        "batch-1",
        "source-batch-1",
        "Passed",
        "Yes",
        "No",
        "No",
        "2026-01-01",
        "2026-01-02",
        "2026-08-01",
        "2026-07-15",
        "2026-09-01",
      ],
    ]));

    expect(packages[0]).toEqual({
      package_tag: "pkg-full",
      strain: "GRC Strain",
      source_harvest: "harvest-1",
      source_packages: "source-1",
      original_source_package_label: "original-1",
      source_processing_jobs: "job-1",
      location: "Vault",
      sublocation: "Shelf A",
      item: "Flower 3.5g",
      category: "Flower",
      quantity: 12.5,
      unit_of_measure: "Each",
      production_batch_number: "batch-1",
      source_production_batch: "source-batch-1",
      lab_testing_status: "Passed",
      finished_goods: "Yes",
      administrative_hold: "No",
      administrative_recall: "No",
      packaged_date: "2026-01-01",
      received: "2026-01-02",
      expiration_date: "2026-08-01",
      sell_by_date: "2026-07-15",
      lab_test_expiration: "2026-09-01",
    });
  });

  it("converts Excel numeric dates", () => {
    const serial = 45905;
    const parsedDate = XLSX.SSF.parse_date_code(serial);
    const expected = new Date(Date.UTC(parsedDate.y, parsedDate.m - 1, parsedDate.d, parsedDate.H, parsedDate.M, Math.floor(parsedDate.S))).toISOString();
    const packages = parseMetrcWorkbook(workbookBuffer([
      ["Package Tag", "Expiration Date"],
      ["pkg-a", serial],
    ]));

    expect(packages[0].expiration_date).toBe(expected);
  });
});
