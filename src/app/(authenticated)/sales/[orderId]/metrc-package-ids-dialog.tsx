"use client";

import * as Headless from "@headlessui/react";
import { Copy, Package, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type MetrcPackageIdsDialogProps = {
  productName: string;
  packageTags: string[];
};

export function MetrcPackageIdsDialog({ productName, packageTags }: MetrcPackageIdsDialogProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedPackageTag, setCopiedPackageTag] = useState<string | null>(null);
  const [isCopiedVisible, setIsCopiedVisible] = useState(false);
  const fadeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (fadeTimeout.current) {
        clearTimeout(fadeTimeout.current);
      }

      if (removeTimeout.current) {
        clearTimeout(removeTimeout.current);
      }
    };
  }, []);

  async function copyPackageTag(packageTag: string): Promise<void> {
    await navigator.clipboard.writeText(packageTag);

    if (fadeTimeout.current) {
      clearTimeout(fadeTimeout.current);
    }

    if (removeTimeout.current) {
      clearTimeout(removeTimeout.current);
    }

    setCopiedPackageTag(packageTag);
    setIsCopiedVisible(true);
    fadeTimeout.current = setTimeout(() => setIsCopiedVisible(false), 600);
    removeTimeout.current = setTimeout(() => setCopiedPackageTag(null), 1600);
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="xs"
        className="[--btn-icon:var(--color-white)] hover:[--btn-icon:var(--color-white)] active:[--btn-icon:var(--color-white)] dark:hover:[--btn-icon:var(--color-white)] dark:active:[--btn-icon:var(--color-white)]"
        onClick={() => setIsOpen(true)}
        aria-label="Package details"
      >
        <Package data-slot="icon" aria-hidden="true" />
      </Button>
      <Dialog size="md" open={isOpen} onClose={setIsOpen} className="relative">
        <Headless.CloseButton
          className="absolute top-4 right-4 cursor-pointer rounded-lg bg-zinc-950 p-2 text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
          aria-label="Close dialog"
        >
          <X className="size-4" aria-hidden="true" />
        </Headless.CloseButton>
        <DialogTitle className="pr-10">Package Details</DialogTitle>
        <DialogDescription>{productName}</DialogDescription>
        <DialogBody>
          <div className="max-h-96 overflow-y-auto rounded-lg bg-zinc-50 p-4 dark:bg-zinc-950/40">
            <ul className="space-y-2">
              {packageTags.map((packageTag) => (
                <li key={packageTag} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 font-mono text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  <span className="break-all">{packageTag}</span>
                  <span className="relative shrink-0">
                    <button
                      type="button"
                      className="rounded-md p-1.5 cursor-pointer text-zinc-500 transition hover:bg-zinc-950/5 hover:text-zinc-950 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                      onClick={() => void copyPackageTag(packageTag)}
                      aria-label={`Copy ${packageTag}`}
                    >
                      <Copy className="size-4" aria-hidden="true" />
                    </button>
                    {copiedPackageTag === packageTag ? (
                      <span className={`pointer-events-none absolute z-50 -top-5 right-0 rounded-md bg-zinc-950 px-2 py-1 text-xs font-semibold text-white shadow-sm transition-opacity duration-[400ms] dark:bg-zinc-950 dark:text-white/85 ${isCopiedVisible ? "opacity-100" : "opacity-0"}`}>
                        Copied!
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </DialogBody>
      </Dialog>
    </>
  );
}
