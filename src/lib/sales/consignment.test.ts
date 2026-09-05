import { describe, expect, it } from "vitest";
import { assertSingleConsignmentSource, isConsignmentPackage, MIXED_CONSIGNMENT_MESSAGE, MULTIPLE_DISTRIBUTORS_MESSAGE } from "./consignment";

describe("order consignment rules", () => {
  it("treats packages without a distributor as in-house", () => {
    expect(isConsignmentPackage({})).toBe(false);
    expect(isConsignmentPackage({ consignment_distributor_id: "" })).toBe(false);
    expect(isConsignmentPackage({ consignment_distributor_id: "dist-1" })).toBe(true);
  });

  it("allows all in-house or all consignment packages from one distributor", () => {
    expect(() => assertSingleConsignmentSource([])).not.toThrow();
    expect(() => assertSingleConsignmentSource([{}, {}])).not.toThrow();
    expect(() => assertSingleConsignmentSource([{ consignment_distributor_id: "dist-1" }, { consignment_distributor_id: "dist-1" }])).not.toThrow();
  });

  it("rejects a mix of consignment and in-house packages", () => {
    expect(() => assertSingleConsignmentSource([{ consignment_distributor_id: "dist-1" }, {}])).toThrow(MIXED_CONSIGNMENT_MESSAGE);
    expect(() => assertSingleConsignmentSource([{ consignment_distributor_id: "dist-1" }, { consignment_distributor_id: "" }])).toThrow(MIXED_CONSIGNMENT_MESSAGE);
  });

  it("rejects consignment packages from different distributors", () => {
    expect(() => assertSingleConsignmentSource([{ consignment_distributor_id: "dist-1" }, { consignment_distributor_id: "dist-2" }])).toThrow(MULTIPLE_DISTRIBUTORS_MESSAGE);
    expect(() => assertSingleConsignmentSource([{ consignment_distributor_id: "dist-1" }, { consignment_distributor_id: "dist-2" }, {}])).toThrow(MULTIPLE_DISTRIBUTORS_MESSAGE);
  });
});
