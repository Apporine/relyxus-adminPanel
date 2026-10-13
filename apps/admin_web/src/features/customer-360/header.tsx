import {
  ClipboardPlus,
  Download,
  FilePlus2,
  KeyRound,
  Pencil,
  Server,
  UserPlus,
} from "lucide-react";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CopyableId } from "@/components/ui/copyable-id";
import { Field, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/field";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { accountStatus, healthStatus, licenseState, lifecycleStage } from "@/domain/status";
import { formatDate, formatMoneyCompact, formatRelativeDays, plural } from "@/lib/format";
import type { Customer360 } from "./load";

const tierLabel = {
  standard: "Standard support",
  premium: "Premium support",
  mission_critical: "Mission critical support",
};

function ReasonField({ id }: { id: string }) {
  return (
    <Field>
      <Label htmlFor={id}>Reason</Label>
      <Textarea id={id} name="reason" required />
      <FieldHint>The reason is stored with the audit record.</FieldHint>
    </Field>
  );
}

/** Header summary and the Customer 360 action set (spec §30.1, copy from §31). */
export function Customer360Header({ data }: { data: Customer360 }) {
  const { customer, products, contracts } = data;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Breadcrumbs
          items={[
            { label: "Customers", href: "/customers" },
            ...(data.parent
              ? [{ label: data.parent.displayName, href: `/customers/${data.parent.id}` }]
              : []),
            { label: customer.displayName },
          ]}
        />
        <PageHeader
          title={customer.displayName}
          description={customer.legalName}
          meta={
            <>
              <CopyableId value={customer.id} label="Customer ID" />
              <StatusBadge
                tone={accountStatus[customer.status].tone}
                label={accountStatus[customer.status].label}
              />
              <StatusBadge
                tone={healthStatus[customer.health].tone}
                label={healthStatus[customer.health].label}
              />
              <Tag>{lifecycleStage[customer.lifecycleStage]}</Tag>
              <Tag>{tierLabel[customer.supportTier]}</Tag>
              {products.map((p) => (
                <Tag key={p.id}>{p.code}</Tag>
              ))}
            </>
          }
          actions={
            <>
              <DesignPreviewDialog
                trigger="Edit customer"
                triggerIcon={<Pencil aria-hidden="true" />}
                title="Edit customer"
                description="Update operating details. Fields synchronised from the CRM are read-only here and change in the CRM."
                confirmLabel="Save changes"
              >
                <Field>
                  <Label htmlFor="edit-display">Display name</Label>
                  <Input
                    id="edit-display"
                    name="displayName"
                    defaultValue={customer.displayName}
                    required
                  />
                </Field>
                <Field>
                  <Label htmlFor="edit-legal">Legal name</Label>
                  <Input
                    id="edit-legal"
                    name="legalName"
                    defaultValue={customer.legalName}
                    readOnly
                    aria-describedby="edit-legal-hint"
                  />
                  <FieldHint id="edit-legal-hint">Owned by the CRM.</FieldHint>
                </Field>
                <ReasonField id="edit-reason" />
              </DesignPreviewDialog>
              <DesignPreviewDialog
                trigger="Add contact"
                triggerIcon={<UserPlus aria-hidden="true" />}
                title="Add contact"
                description="Add a customer contact with a clear responsibility. Contact changes appear in the customer timeline."
                confirmLabel="Add contact"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="contact-name">Name</Label>
                    <Input id="contact-name" name="name" required autoComplete="off" />
                  </Field>
                  <Field>
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="off"
                    />
                  </Field>
                </div>
                <Field>
                  <Label htmlFor="contact-role">Responsibility</Label>
                  <Select id="contact-role" name="role" defaultValue="technical">
                    <option value="executive">Executive</option>
                    <option value="commercial">Commercial</option>
                    <option value="technical">Technical</option>
                    <option value="security">Security</option>
                    <option value="support">Support</option>
                    <option value="billing">Billing</option>
                  </Select>
                </Field>
              </DesignPreviewDialog>
              <DesignPreviewDialog
                trigger="Add contract"
                triggerIcon={<FilePlus2 aria-hidden="true" />}
                title="Create contract record"
                description="Create the operating contract record and link the approved source document or external system reference."
                confirmLabel="Create contract"
              >
                <Field>
                  <Label htmlFor="contract-ref">Source document or system reference</Label>
                  <Input id="contract-ref" name="reference" required />
                </Field>
              </DesignPreviewDialog>
              <DesignPreviewDialog
                trigger="Issue license request"
                triggerIcon={<KeyRound aria-hidden="true" />}
                title="Issue commercial license"
                description="This creates a new signed license revision. It does not rebuild or modify the product application image."
                confirmLabel="Issue license"
              >
                <Field>
                  <Label htmlFor="issue-contract">Source contract</Label>
                  <Select id="issue-contract" name="contract" required defaultValue="">
                    <option value="" disabled>
                      Choose a contract
                    </option>
                    {contracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.number}
                      </option>
                    ))}
                  </Select>
                  <FieldHint>
                    Issuing requires approval from a second person under segregation of duties.
                  </FieldHint>
                </Field>
                <ReasonField id="issue-reason" />
              </DesignPreviewDialog>
              <DesignPreviewDialog
                trigger="Add deployment"
                triggerIcon={<Server aria-hidden="true" />}
                title="Register deployment"
                description="Register an authorized customer deployment. Do not enter customer secrets or production credentials."
                confirmLabel="Add deployment"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <Label htmlFor="dep-name">Logical name</Label>
                    <Input id="dep-name" name="logicalName" required />
                  </Field>
                  <Field>
                    <Label htmlFor="dep-env">Environment</Label>
                    <Select id="dep-env" name="environment" defaultValue="production">
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="dr">Disaster recovery</option>
                    </Select>
                  </Field>
                </div>
              </DesignPreviewDialog>
              <DesignPreviewDialog
                trigger="Export dossier"
                triggerIcon={<Download aria-hidden="true" />}
                title="Export customer dossier"
                description="The export contains only fields you are authorized to view. The export event is recorded in audit."
                confirmLabel="Export dossier"
              />
              <DesignPreviewDialog
                trigger="Create task"
                triggerVariant="primary"
                triggerIcon={<ClipboardPlus aria-hidden="true" />}
                title="Create task"
                description={`Create an operational task for ${customer.displayName}. It appears in the owner's inbox and this customer's timeline.`}
                confirmLabel="Create task"
              >
                <Field>
                  <Label htmlFor="c360-task-title">Title</Label>
                  <Input id="c360-task-title" name="title" required />
                </Field>
                <Field>
                  <Label htmlFor="c360-task-due">Due date</Label>
                  <Input id="c360-task-due" name="due" type="date" required />
                </Field>
              </DesignPreviewDialog>
            </>
          }
        />
      </div>
      <Summary data={data} />
    </div>
  );
}

function Summary({ data }: { data: Customer360 }) {
  const { customer, contracts, licenses, deployments, supportCases, now } = data;
  const base = `/customers/${customer.id}`;
  const renewal = contracts[0];
  const supported = deployments.filter((d) => d.supportState === "supported").length;
  const openCases = supportCases.filter((c) => c.status !== "resolved");
  return (
    <section
      aria-label="Customer summary"
      className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6"
    >
      <MetricCard
        label="Annual contract value"
        value={
          customer.annualContractValue ? formatMoneyCompact(customer.annualContractValue) : "—"
        }
        detail={customer.annualContractValue ? undefined : "No approved commercial record"}
        href={`${base}?tab=finance`}
        source="Approved contract records"
        restricted={!data.canViewCommercial}
      />
      <MetricCard
        label="Next renewal"
        value={customer.nextRenewalAt ? formatDate(customer.nextRenewalAt) : "—"}
        detail={
          customer.nextRenewalAt
            ? `${formatRelativeDays(customer.nextRenewalAt, now)}${renewal ? ` · ${renewal.noticeDays} day notice` : ""}`
            : "No contract yet"
        }
        href={`${base}?tab=contracts`}
        source="Contract end date"
      />
      <MetricCard
        label="Licenses"
        value={String(licenses.length)}
        detail={
          data.worstLicenseState === "active" ? (
            "All active"
          ) : data.worstLicenseState ? (
            <StatusBadge
              tone={licenseState[data.worstLicenseState].tone}
              label={`Needs attention: ${licenseState[data.worstLicenseState].label}`}
            />
          ) : (
            "None issued"
          )
        }
        href={`${base}?tab=licenses`}
        source="Signed license records"
      />
      <MetricCard
        label="Deployments"
        value={String(deployments.length)}
        detail={deployments.length ? `${supported} supported` : "None registered"}
        href={`${base}?tab=deployments`}
        source="Registered deployments"
      />
      <MetricCard
        label="Open support cases"
        value={String(openCases.length)}
        detail={
          openCases.length
            ? plural(openCases.filter((c) => c.slaState !== "within").length, "SLA concern")
            : "None open"
        }
        href={`${base}?tab=support`}
        source="Support platform references"
      />
      <MetricCard
        label="Health score"
        value={`${data.score} / 100`}
        detail={`${data.factors.filter((f) => f.status === "risk" || f.status === "attention").length} factors need attention`}
        href={`${base}?tab=overview`}
        source="Advisory, illustrative weights"
      />
    </section>
  );
}
