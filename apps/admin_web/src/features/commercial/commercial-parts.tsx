import { FilePlus2 } from "lucide-react";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { Field, Input, Label, Select } from "@/components/ui/field";
import { SegmentNav } from "@/components/ui/segment-nav";
import { listCustomers } from "@/server/data";

export type CommercialView = "contracts" | "renewals" | "entitlements" | "drift";

export function CommercialNav({ current }: { current: CommercialView }) {
  return (
    <SegmentNav
      label="Commercial views"
      items={[
        { href: "/commercial", label: "Contracts", current: current === "contracts" },
        { href: "/commercial/renewals", label: "Renewal radar", current: current === "renewals" },
        {
          href: "/commercial/entitlements",
          label: "Entitlement definitions",
          current: current === "entitlements",
        },
        { href: "/commercial/drift", label: "Drift review", current: current === "drift" },
      ]}
    />
  );
}

/** Create contract (spec §31 copy). Opens directly for the command palette quick action. */
export async function CreateContract({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, customers] = await Promise.all([searchParams, listCustomers()]);
  return (
    <DesignPreviewDialog
      trigger="Create contract"
      triggerVariant="primary"
      triggerIcon={<FilePlus2 aria-hidden="true" />}
      title="Create contract record"
      description="Create the operating contract record and link the approved source document or external system reference."
      confirmLabel="Create contract"
      defaultOpen={params?.create === "1"}
    >
      <Field>
        <Label htmlFor="contract-customer">Customer</Label>
        <Select id="contract-customer" name="customer" required defaultValue="">
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
      <Field>
        <Label htmlFor="contract-source">Source document or system reference</Label>
        <Input id="contract-source" name="reference" required />
      </Field>
    </DesignPreviewDialog>
  );
}
