import { Plus } from "lucide-react";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { Field, Input, Label, Select } from "@/components/ui/field";
import { listCustomers } from "@/server/data";

/** Add deployment (spec §31 copy). Opens directly for the command palette's quick action. */
export async function AddDeployment({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, customers] = await Promise.all([searchParams, listCustomers()]);
  return (
    <DesignPreviewDialog
      trigger="Add deployment"
      triggerVariant="primary"
      triggerIcon={<Plus aria-hidden="true" />}
      title="Register deployment"
      description="Register an authorized customer deployment. Do not enter customer secrets or production credentials."
      confirmLabel="Add deployment"
      defaultOpen={params?.create === "1"}
    >
      <Field>
        <Label htmlFor="add-dep-customer">Customer</Label>
        <Select id="add-dep-customer" name="customer" required defaultValue="">
          <option value="" disabled>
            Choose a customer
          </option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="add-dep-name">Logical name</Label>
          <Input id="add-dep-name" name="logicalName" required />
        </Field>
        <Field>
          <Label htmlFor="add-dep-env">Environment</Label>
          <Select id="add-dep-env" name="environment" defaultValue="production">
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="dr">Disaster recovery</option>
          </Select>
        </Field>
      </div>
    </DesignPreviewDialog>
  );
}
