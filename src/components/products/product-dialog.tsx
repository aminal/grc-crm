"use client";

import * as Headless from "@headlessui/react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { ProductForm, type ProductFormBrandOption, type ProductFormStrainOption, type ProductFormValues } from "@/components/products/product-form";
import { Dialog, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { createProductFormAction, updateProductFormAction } from "@/app/(authenticated)/products/actions";

type ProductDialogProduct = {
  id: string;
  data: ProductFormValues;
};

type ProductDialogProps = {
  mode: "create" | "edit";
  product?: ProductDialogProduct;
  brands: ProductFormBrandOption[];
  strains: ProductFormStrainOption[];
  closeHref: string;
};

type ProductFormState = {
  error: string | null;
  success: boolean;
};

const initialState: ProductFormState = {
  error: null,
  success: false,
};

export function ProductDialog({ mode, product, brands, strains, closeHref }: ProductDialogProps): React.ReactElement {
  const router = useRouter();
  const action = mode === "edit" && product
    ? updateProductFormAction.bind(null, product.id)
    : createProductFormAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      router.replace(closeHref, { scroll: false });
    }
  }, [closeHref, router, state.success]);

  function close(): void {
    router.replace(closeHref, { scroll: false });
  }

  const title = mode === "create" ? "Add Product" : `Edit ${product?.data.name ?? "Product"}`;
  const description = mode === "create"
    ? "Add a product used throughout the sales workflow."
    : "Update product details.";

  return (
    <Dialog size="xl" open onClose={close} className="relative">
      <Headless.CloseButton
        className="absolute top-4 right-4 rounded-lg bg-zinc-950 p-2 cursor-pointer text-white transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
        aria-label="Close dialog"
        onClick={close}
      >
        <X className="size-4" aria-hidden="true" />
      </Headless.CloseButton>
      <DialogTitle className="pr-10">{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
      <DialogBody>
        <ProductForm
          brands={brands}
          strains={strains}
          product={product?.data}
          action={formAction}
          submitLabel={mode === "create" ? "Add Product" : "Save Changes"}
          pendingLabel={mode === "create" ? "Adding Product..." : "Saving Changes..."}
          pending={pending}
          error={state.error}
          showReason={mode === "edit"}
          onCancel={close}
        />
      </DialogBody>
    </Dialog>
  );
}

