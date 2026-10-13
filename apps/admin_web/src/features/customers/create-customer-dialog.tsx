import { Plus } from "lucide-react";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { Field, FieldHint, Input, Label, Textarea } from "@/components/ui/field";

/** Create customer (spec §31): primary action on Home and Customers. */
export function CreateCustomerDialog() {
  return (
    <DesignPreviewDialog
      trigger="Create customer"
      triggerVariant="primary"
      triggerIcon={<Plus aria-hidden="true" />}
      title="Create customer"
      description="Create a new Apporine customer record. You can add products, contracts, licenses and deployments after the customer exists."
      confirmLabel="Create customer"
    >
      <Field>
        <Label htmlFor="customer-legal">Legal name</Label>
        <Input id="customer-legal" name="legalName" required autoComplete="organization" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="customer-display">Display name</Label>
          <Input id="customer-display" name="displayName" required />
        </Field>
        <Field>
          <Label htmlFor="customer-country">Headquarters country</Label>
          <Input id="customer-country" name="country" required autoComplete="country-name" />
        </Field>
      </div>
      <Field>
        <Label htmlFor="customer-notes">Commercial handoff notes</Label>
        <Textarea id="customer-notes" name="notes" />
        <FieldHint>Do not enter customer secrets, credentials or production data.</FieldHint>
      </Field>
    </DesignPreviewDialog>
  );
}
