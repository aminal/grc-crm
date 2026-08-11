import { describe, expect, it } from "vitest";
import { assertSameSourcePrice, sourcePackageKey, type SourcePackageFields } from "./pricing";

function packageFields(overrides: Partial<SourcePackageFields>): SourcePackageFields {
  return {
    package_tag: "pkg-a",
    source_packages: "",
    original_source_package_label: "",
    ...overrides,
  };
}

describe("sales pricing rules", () => {
  it("uses source package keys with original-label and tag fallbacks", () => {
    expect(sourcePackageKey(packageFields({ package_tag: "pkg-a", source_packages: "source-1", original_source_package_label: "original-1" }))).toBe("source-1");
    expect(sourcePackageKey(packageFields({ package_tag: "pkg-a", original_source_package_label: "original-1" }))).toBe("original-1");
    expect(sourcePackageKey(packageFields({ package_tag: "pkg-a" }))).toBe("pkg-a");
  });

  it("requires identical prices for packages from the same source package", () => {
    const sourcePrices = new Map<string, number>();
    const firstPackage = packageFields({ package_tag: "pkg-a", source_packages: "source-1" });
    const secondPackage = packageFields({ package_tag: "pkg-b", source_packages: "source-1" });

    assertSameSourcePrice(sourcePrices, firstPackage, 1200);
    expect(() => assertSameSourcePrice(sourcePrices, secondPackage, 1300)).toThrow("Packages from the same source package must use identical prices.");
    expect(() => assertSameSourcePrice(sourcePrices, secondPackage, 1200)).not.toThrow();
  });
});
