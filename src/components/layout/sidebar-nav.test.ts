import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("sidebarItemClasses", () => {
  it("includes a positioned ancestor for touch targets", () => {
    const filePath = resolve(process.cwd(), "src/components/layout/sidebar-nav.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toMatch(/const sidebarItemClasses = cn\(\s*[\s\S]*?["']relative\b/);
  });
});
