"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductForm, type ProductFormBrandOption, type ProductFormStrainOption, type ProductFormValues } from "@/components/products/product-form";
import { DeleteConfirmationDialog } from "@/components/ui/dialog";
import { archiveProductAction, updateProductFormAction } from "@/app/(authenticated)/products/actions";

type ProductEditFormProduct = {
  id: string;
  data: ProductFormValues;
};

type ProductEditFormProps = {
  product: ProductEditFormProduct;
  brands: ProductFormBrandOption[];
  strains: ProductFormStrainOption[];
  cancelHref: string;
  successHref: string;
  canArchive?: boolean;
};

type ProductFormState = {
  error: string | null;
  success: boolean;
};

const initialState: ProductFormState = {
  error: null,
  success: false,
};

export function ProductEditForm({ product, brands, strains, cancelHref, successHref, canArchive = false }: ProductEditFormProps): React.ReactElement {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateProductFormAction.bind(null, product.id), initialState);
  const [showArchiveConfirmation, setShowArchiveConfirmation] = useState(false);

  useEffect(() => {
    if (state.success) {
      router.replace(successHref, { scroll: false });
    }
  }, [router, state.success, successHref]);

  return (
    <>
      <ProductForm
        brands={brands}
        strains={strains}
        product={product.data}
        action={formAction}
        submitLabel="Save Changes"
        pendingLabel="Saving Changes..."
        pending={pending}
        error={state.error}
        showReason
        onCancel={() => router.replace(cancelHref, { scroll: false })}
        onArchive={canArchive ? () => setShowArchiveConfirmation(true) : undefined}
      />
      {canArchive ? (
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
