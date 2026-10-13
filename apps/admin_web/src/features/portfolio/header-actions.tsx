import { Download, Stamp } from "lucide-react";
import Link from "next/link";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldHint, Input, Label, Select } from "@/components/ui/field";
import type { Customer, StaffUser } from "@/domain/types";
import { CreateCustomerDialog } from "@/features/customers/create-customer-dialog";

/** Page actions for the command center (spec §8.1): primary Create customer, then secondaries. */
export function CommandCenterActions({
  customers,
  staff,
}: {
  customers: Customer[];
  staff: StaffUser[];
}) {
  return (
    <>
      <DesignPreviewDialog
        trigger="Create task"
        title="Create task"
        description="Create an operational task with an owner and due date. It appears in the owner's inbox."
        confirmLabel="Create task"
      >
        <Field>
          <Label htmlFor="task-title">Title</Label>
          <Input id="task-title" name="title" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <Label htmlFor="task-customer">Customer</Label>
            <Select id="task-customer" name="customer" defaultValue="">
              <option value="">No customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="task-owner">Owner</Label>
            <Select id="task-owner" name="owner" required defaultValue="">
              <option value="" disabled>
                Choose an owner
              </option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="task-priority">Priority</Label>
            <Select id="task-priority" name="priority" defaultValue="medium">
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="task-due">Due date</Label>
            <Input id="task-due" name="due" type="date" required />
          </Field>
        </div>
      </DesignPreviewDialog>
      <Button asChild>
        <Link href="/approvals">
          <Stamp aria-hidden="true" />
          Open approvals
        </Link>
      </Button>
      <DesignPreviewDialog
        trigger="Export portfolio summary"
        triggerIcon={<Download aria-hidden="true" />}
        title="Export portfolio summary"
        description="The export contains only fields you are authorized to view. The export event is recorded in audit."
        confirmLabel="Start export"
      >
        <Field>
          <Label htmlFor="export-format">Format</Label>
          <Select id="export-format" name="format" defaultValue="pdf">
            <option value="pdf">PDF summary</option>
            <option value="csv">CSV records</option>
          </Select>
          <FieldHint>
            Large exports run in the background and produce a time-limited download.
          </FieldHint>
        </Field>
      </DesignPreviewDialog>
      <CreateCustomerDialog />
    </>
  );
}
