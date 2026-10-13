import { notFound } from "next/navigation";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DescriptionList } from "@/components/ui/description-list";
import { Notice } from "@/components/ui/feedback";
import { Field, Label, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import type { ContactRole } from "@/domain/types";
import { getContact, getCustomer } from "@/server/data";

const roleLabel: Record<ContactRole, string> = {
  executive: "Executive",
  commercial: "Commercial",
  technical: "Technical",
  security: "Security",
  support: "Support",
  billing: "Billing",
};

/** Contact detail (spec §12, §30): a first-class record, not free text. */
export async function ContactDetail({
  params,
}: {
  params: Promise<{ id: string; contactId: string }>;
}) {
  const { id, contactId } = await params;
  const [customer, contact] = await Promise.all([getCustomer(id), getContact(contactId)]);
  if (!customer || !contact || contact.customerId !== customer.id) notFound();

  const sensitive = contact.roles.some((r) => r === "security" || r === "executive");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Customers", href: "/customers" },
            { label: customer.displayName, href: `/customers/${customer.id}?tab=contacts` },
            { label: contact.name },
          ]}
        />
        <PageHeader
          title={contact.name}
          description={`${contact.title} at ${customer.displayName}`}
          meta={
            <>
              {contact.active ? (
                <StatusBadge
                  tone={contact.verified ? "healthy" : "neutral"}
                  label={contact.verified ? "Verified" : "Unverified"}
                />
              ) : (
                <StatusBadge tone="risk" label="Inactive" />
              )}
              {contact.roles.map((r) => (
                <Tag key={r}>{roleLabel[r]}</Tag>
              ))}
            </>
          }
          actions={
            <DesignPreviewDialog
              trigger={contact.active ? "Mark inactive" : "Reactivate contact"}
              title={contact.active ? "Mark contact inactive" : "Reactivate contact"}
              description={
                sensitive
                  ? "This contact holds an executive or security responsibility. Marking them inactive opens an ownership review task."
                  : "The change appears in the customer timeline."
              }
              confirmLabel={contact.active ? "Mark inactive" : "Reactivate contact"}
            >
              <Field>
                <Label htmlFor="contact-reason">Reason</Label>
                <Textarea id="contact-reason" name="reason" required />
              </Field>
            </DesignPreviewDialog>
          }
        />
      </div>
      {!contact.active && sensitive ? (
        <Notice tone="risk" title="Ownership review needed">
          An inactive {contact.roles.map((r) => roleLabel[r].toLowerCase()).join(" and ")} contact
          leaves a gap in the customer relationship. Assign a replacement.
        </Notice>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card aria-labelledby="contact-details">
          <CardHeader>
            <CardTitle id="contact-details">Contact details</CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionList
              columns={2}
              items={[
                {
                  term: "Email",
                  value: (
                    <a
                      className="text-violet-text hover:underline"
                      href={`mailto:${contact.email}`}
                    >
                      {contact.email}
                    </a>
                  ),
                },
                { term: "Phone", value: undefined },
                {
                  term: "Preferred channel",
                  value: <span className="capitalize">{contact.preferredChannel}</span>,
                },
                { term: "Timezone", value: contact.timezone },
                {
                  term: "Responsibilities",
                  value: contact.roles.map((r) => roleLabel[r]).join(", "),
                },
                { term: "Verification", value: contact.verified ? "Verified" : "Not verified" },
              ]}
            />
          </CardContent>
        </Card>
        <Card aria-labelledby="contact-consent">
          <CardHeader>
            <CardTitle id="contact-consent">Communication and consent</CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionList
              items={[
                {
                  term: "Operational notices",
                  value: contact.active ? "Receives" : "Suppressed while inactive",
                },
                { term: "Marketing", value: "Not stored in the control plane" },
                {
                  term: "Contact ID",
                  value: <code className="font-mono text-micro">{contact.id}</code>,
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
