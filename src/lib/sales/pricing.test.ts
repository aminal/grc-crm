import { describe, expect, it } from "vitest";
import { assertSameSourcePrice, sourcePackageKey, type SourcePackageFields, type SourcePriceRecord } from "./pricing";

function packageFields(overrides: Partial<SourcePackageFields>): SourcePackageFields {
  return {
    package_tag: "pkg-a",
    source_packages: "",
    original_source_package_label: "",
    quantity: 1,
    ...overrides,
  };
}

describe("sales pricing rules", () => {
  it("uses source package keys with original-label and tag fallbacks", () => {
    expect(sourcePackageKey(packageFields({ package_tag: "pkg-a", source_packages: "source-1", original_source_package_label: "original-1" }))).toBe("source-1");
    expect(sourcePackageKey(packageFields({ package_tag: "pkg-a", original_source_package_label: "original-1" }))).toBe("original-1");
    expect(sourcePackageKey(packageFields({ package_tag: "pkg-a" }))).toBe("pkg-a");
  });

  it("requires the same price per unit for packages from the same source package", () => {
    const sourcePrices = new Map<string, SourcePriceRecord>();
    // $24/unit: 16 units => $384 (38400 cents), 13 units => $312 (31200 cents)
    const firstPackage = packageFields({ package_tag: "pkg-a", source_packages: "source-1", quantity: 16 });
    const secondPackage = packageFields({ package_tag: "pkg-b", source_packages: "source-1", quantity: 13 });

    assertSameSourcePrice(sourcePrices, firstPackage, 38400);
    expect(() => assertSameSourcePrice(sourcePrices, secondPackage, 31200)).not.toThrow();

    // Different unit price ($25/unit for 13 units => $325) must be rejected.
    expect(() => assertSameSourcePrice(sourcePrices, packageFields({ package_tag: "pkg-c", source_packages: "source-1", quantity: 13 }), 32500)).toThrow("Packages from the same source package must use the same price per unit.");

    // Same unit price via a different quantity ($24/unit * 8 units => $192) is accepted.
    expect(() => assertSameSourcePrice(sourcePrices, packageFields({ package_tag: "pkg-d", source_packages: "source-1", quantity: 8 }), 19200)).not.toThrow();
  });

  it("skips the unit-price check when a package has no quantity", () => {
    const sourcePrices = new Map<string, SourcePriceRecord>();
    assertSameSourcePrice(sourcePrices, packageFields({ package_tag: "pkg-a", source_packages: "source-1", quantity: 16 }), 38400);

    expect(() => assertSameSourcePrice(sourcePrices, packageFields({ package_tag: "pkg-b", source_packages: "source-1", quantity: 0 }), 9999)).not.toThrow();
  });
});
