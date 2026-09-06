"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProductForm, type ProductFormBrandOption, type ProductFormStrainOption, type ProductFormValues } from "@/components/products/product-form";
import { updateProductFormAction } from "@/app/(authenticated)/products/actions";
import type { ProductStatus } from "@/lib/domain/types";

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
};

type ProductFormState = {
  error: string | null;
  success: boolean;
  status: ProductStatus | null;
};

const initialState: ProductFormState = {
  error: null,
  success: false,
  status: null,
};

export function ProductEditForm({ product, brands, strains, cancelHref, successHref }: ProductEditFormProps): React.ReactElement {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateProductFormAction.bind(null, product.id), initialState);

  useEffect(() => {
    if (state.success) {
      router.replace(state.status === "Archived" ? "/settings/products" : successHref, { scroll: false });
    }
  }, [router, state.status, state.success, successHref]);

  return (
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
    />
  );
}
