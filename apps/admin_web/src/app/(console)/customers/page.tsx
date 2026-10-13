import { Download, Upload } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { Field, FieldHint, Input, Label } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { CreateCustomerDialog } from "@/features/customers/create-customer-dialog";
import { CustomerList, CustomerListSkeleton } from "@/features/customers/customer-list";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage({ searchParams }: PageProps<"/customers">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Customers"
        description="Find and prioritise customers across every Apporine product."
        actions={
          <>
            <DesignPreviewDialog
              trigger="Import reference"
              triggerIcon={<Upload aria-hidden="true" />}
              title="Import customer reference"
              description="Link an existing CRM or finance record to a customer. Fields owned by the source system stay read-only here."
              confirmLabel="Import reference"
            >
              <Field>
                <Label htmlFor="import-ref">CRM or finance record ID</Label>
                <Input id="import-ref" name="reference" required placeholder="CRM-01082" />
                <FieldHint>
                  The source system remains authoritative for synchronised fields.
                </FieldHint>
              </Field>
            </DesignPreviewDialog>
            <DesignPreviewDialog
              trigger="Export"
              triggerIcon={<Download aria-hidden="true" />}
              title="Export customers"
              description="The export contains only fields you are authorized to view. The export event is recorded in audit."
              confirmLabel="Start export"
            />
            <CreateCustomerDialog />
          </>
        }
      />
      <Suspense fallback={<CustomerListSkeleton />}>
        <CustomerList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
