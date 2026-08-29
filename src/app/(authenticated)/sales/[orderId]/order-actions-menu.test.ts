import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("OrderActionsMenu", () => {
  it("disables Next.js prefetching for the invoice PDF link", () => {
    const filePath = resolve(process.cwd(), "src/app/(authenticated)/sales/[orderId]/order-actions-menu.tsx");
    const source = readFileSync(filePath, "utf8");

    expect(source).toMatch(/<DropdownItem\s+href=\{`\/sales\/\$\{orderId\}\/invoice\/pdf`\}\s+target='_blank'\s+rel='noopener noreferrer'\s+prefetch=\{false\}>/);
  });
});
