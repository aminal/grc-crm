"use client";

import * as Headless from "@headlessui/react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { ProductForm, type ProductFormBrandOption, type ProductFormStrainOption, type ProductFormValues } from "@/components/products/product-form";
import { DeleteConfirmationDialog, Dialog, DialogBody, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { archiveProductAction, createProductFormAction, updateProductFormAction } from "@/app/(authenticated)/products/actions";

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
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false);

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
    <>
      <Dialog size="xl" open onClose={close} className="relative">
        <Headless.CloseButton
          className="absolute top-4 right-4 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200! p-2 cursor-pointer transition hover:bg-zinc-800 focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 dark:bg-zinc-950/40 dark:hover:bg-zinc-950"
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
            onArchive={mode === "edit" && product ? () => setShowArchiveConfirmation(true) : undefined}
          />
        </DialogBody>
      </Dialog>
      {mode === "edit" && product ? (
        <DeleteConfirmationDialog
          open={showArchiveConfirmation}
          onClose={() => setShowArchiveConfirmation(false)}
          title="Archive Product"
          description={<>This will archive {product.data.name}. Existing orders and packages that reference it will keep their reference. Type ARCHIVE to confirm.</>}
          action={archiveProductAction.bind(null, product.id)}
          submitLabel="Archive Product"
          confirmationValue="ARCHIVE"
        />
      ) : null}
    </>
  );
}

