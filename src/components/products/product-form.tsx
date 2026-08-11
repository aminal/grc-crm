import { Button } from "@/components/ui/button";
import { DialogActions } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { ProductData } from "@/lib/domain/types";

export type ProductFormValues = Pick<ProductData, "name" | "brand_id" | "category" | "sku" | "notes">;
export type ProductFormBrandOption = {
  id: string;
  name: string;
};

type ProductFormProps = {
  brands: ProductFormBrandOption[];
  product?: ProductFormValues;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  error: string | null;
  showReason: boolean;
  onCancel: () => void;
};

export function ProductForm({
  brands,
  product,
  action,
  submitLabel,
  pendingLabel,
  pending,
  error,
  showReason,
  onCancel,
}: ProductFormProps): React.ReactElement {
  const hasBrands = brands.length > 0;

  return (
    <form action={action} className="space-y-4">
      {error ? <div className="rounded-lg bg-red-500/15 p-3 text-sm/6 font-medium text-red-700 ring-1 ring-red-500/20">{error}</div> : null}
      {!hasBrands ? (
        <div className="rounded-lg bg-amber-500/15 p-3 text-sm/6 font-medium text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200">
          Create a brand before adding products.
        </div>
      ) : null}
      <Field label="Name">
        <Input name="name" defaultValue={product?.name ?? ""} required disabled={pending} />
      </Field>
      <Field label="Brand">
        <Select name="brand_id" defaultValue={product?.brand_id ?? ""} required disabled={pending || !hasBrands}>
          <option value="" disabled>Select a brand</option>
          {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
        </Select>
      </Field>
      <Field label="Category">
        <Input name="category" defaultValue={product?.category ?? ""} disabled={pending} />
      </Field>
      <Field label="SKU">
        <Input name="sku" defaultValue={product?.sku ?? ""} disabled={pending} />
      </Field>
      <Field label="Notes">
        <Textarea name="notes" defaultValue={product?.notes ?? ""} rows={4} disabled={pending} />
      </Field>
      {showReason ? (
        <Field label="Reason for edit">
          <Textarea name="reason" rows={3} required disabled={pending} />
        </Field>
      ) : null}
      <DialogActions>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>Cancel</Button>
        <Button disabled={pending || !hasBrands}>{pending ? pendingLabel : submitLabel}</Button>
      </DialogActions>
    </form>
  );
}
