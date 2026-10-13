import { Inbox, Plus } from "lucide-react";
import type { Metadata } from "next";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableId } from "@/components/ui/copyable-id";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState, Kbd, Notice, Skeleton } from "@/components/ui/feedback";
import {
  Field,
  FieldError,
  FieldHint,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/field";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Design system" };

const palette = [
  {
    name: "Apporine Ink",
    token: "--ap-ink",
    hex: "#110A24",
    use: "Primary text, navigation",
    swatch: "bg-ink",
  },
  {
    name: "Canvas",
    token: "--ap-canvas",
    hex: "#FCFAFF",
    use: "Application background",
    swatch: "bg-canvas",
  },
  {
    name: "Primary Violet",
    token: "--ap-violet",
    hex: "#7040FF",
    use: "Primary action, active state",
    swatch: "bg-violet",
  },
  {
    name: "Accent Cyan",
    token: "--ap-cyan",
    hex: "#05DCE8",
    use: "Focus, healthy live state",
    swatch: "bg-cyan",
  },
  {
    name: "Support Coral",
    token: "--ap-coral",
    hex: "#FF694D",
    use: "Risk, destructive intent",
    swatch: "bg-coral",
  },
];

const typeScale = [
  { name: "Page title", className: "text-page-title", spec: "24 / 32 · 600" },
  { name: "Section title", className: "text-section-title", spec: "18 / 26 · 600" },
  { name: "Card or table title", className: "text-card-title", spec: "14 / 20 · 600" },
  { name: "Body", className: "text-body", spec: "14 / 20 · 400" },
  { name: "Dense table and metadata", className: "text-dense", spec: "13 / 18 · 400" },
  { name: "Large metric", className: "text-metric tabular", spec: "28 / 34 · 600" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={`ds-${title}`}>
      <h2 id={`ds-${title}`} className="text-section-title text-fg">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main id="main-content" className="mx-auto flex max-w-6xl flex-col gap-12 px-8 py-10">
      <PageHeader
        title="Design system"
        description="Apporine control plane tokens and components. Quiet enterprise confidence: neutral surfaces dominate, Violet marks action, Cyan marks technical focus or healthy state, Coral marks risk."
      />

      <Section title="Palette">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {palette.map((color) => (
            <li
              key={color.token}
              className="overflow-hidden rounded-card border border-border bg-surface"
            >
              <div className={`h-16 border-b border-border ${color.swatch}`} />
              <div className="p-3">
                <p className="text-card-title">{color.name}</p>
                <p className="font-mono text-micro text-fg-muted">{color.hex}</p>
                <p className="mt-1 text-micro text-fg-secondary">{color.use}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Typography">
        <Card>
          <CardContent className="flex flex-col divide-y divide-border pt-1">
            {typeScale.map((type) => (
              <div key={type.name} className="flex items-baseline justify-between gap-6 py-3">
                <span className={type.className}>
                  {type.name === "Large metric" ? "£4.82M" : type.name}
                </span>
                <span className="shrink-0 font-mono text-micro text-fg-muted">{type.spec}</span>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-6 py-3">
              <code className="font-mono text-micro">sha256:9f2c4e1b7a3d…</code>
              <span className="shrink-0 font-mono text-micro text-fg-muted">
                IBM Plex Mono · 12 / 18
              </span>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">
            <Plus aria-hidden="true" />
            Create customer
          </Button>
          <Button>Create task</Button>
          <Button variant="ghost">Clear filters</Button>
          <Button variant="destructive">Revoke license</Button>
          <Button variant="link">View decided requests</Button>
          <Button variant="primary" disabled>
            Issue license
          </Button>
          <Button size="sm">Save view</Button>
        </div>
      </Section>

      <Section title="Status">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="healthy" label="Healthy" />
          <StatusBadge tone="neutral" label="Watch" />
          <StatusBadge tone="risk" label="At risk" />
          <StatusBadge tone="critical" label="Critical" />
          <StatusBadge tone="info" label="Pending approval" />
          <Tag>RELYXUS</Tag>
          <Tag>eu-west-2</Tag>
        </div>
      </Section>

      <Section title="Metrics">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Active customers"
            value="42"
            detail="3 new this month"
            href="/design-system"
            source="Customers with status Active"
          />
          <MetricCard
            label="Annual contract value"
            value="£4.82M"
            href="/design-system"
            source="Approved contract records"
            restricted
          />
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Loading</CardTitle>
                <CardDescription>Skeletons hold layout while data streams in.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Form fields">
        <Card>
          <CardContent className="grid gap-5 pt-4 md:grid-cols-2">
            <Field>
              <Label htmlFor="ds-name">Legal name</Label>
              <Input id="ds-name" placeholder="Northwind Payments Ltd" />
              <FieldHint>As registered with the company registry.</FieldHint>
            </Field>
            <Field>
              <Label htmlFor="ds-stage">Lifecycle stage</Label>
              <Select id="ds-stage" defaultValue="security-review">
                <option value="commercial-handoff">Commercial handoff</option>
                <option value="security-review">Security review</option>
                <option value="go-live">Go live</option>
              </Select>
            </Field>
            <Field className="md:col-span-2">
              <Label htmlFor="ds-reason">Reason</Label>
              <Textarea id="ds-reason" aria-invalid="true" aria-describedby="ds-reason-error" />
              <FieldError id="ds-reason-error">
                Enter a reason. It becomes part of the audit record.
              </FieldError>
            </Field>
          </CardContent>
        </Card>
      </Section>

      <Section title="Table">
        <Card>
          <Table label="Example licenses">
            <TableHead>
              <TableRow>
                <TableHeaderCell>License ID</TableHeaderCell>
                <TableHeaderCell>Customer</TableHeaderCell>
                <TableHeaderCell>State</TableHeaderCell>
                <TableHeaderCell className="text-end">Expires</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <CopyableId value="LIC_00421" label="License ID" />
                </TableCell>
                <TableCell className="font-medium text-fg">Northwind Payments</TableCell>
                <TableCell>
                  <StatusBadge tone="healthy" label="Active" />
                </TableCell>
                <TableCell className="text-end">31 Mar 2027</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <CopyableId value="LIC_00388" label="License ID" />
                </TableCell>
                <TableCell className="font-medium text-fg">Halden Mutual</TableCell>
                <TableCell>
                  <StatusBadge tone="risk" label="Grace" />
                </TableCell>
                <TableCell className="text-end">2 Nov 2026</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="overview">
          <TabsList aria-label="Customer sections">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="licenses">Licenses</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Identity, lifecycle, owners and next actions.</TabsContent>
          <TabsContent value="contracts">Active, future and historical contracts.</TabsContent>
          <TabsContent value="licenses">Current licenses, state, expiry and revisions.</TabsContent>
        </Tabs>
      </Section>

      <Section title="Dialog">
        <div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open example dialog</Button>
            </DialogTrigger>
            <DialogContent
              title="Suspend license"
              description="Suspension changes the commercial state according to policy. Enter the reason and review affected deployments before continuing."
              dismissible={false}
            >
              <DialogBody>
                <Field>
                  <Label htmlFor="ds-dialog-reason">Reason</Label>
                  <Textarea id="ds-dialog-reason" />
                </Field>
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button>Cancel</Button>
                </DialogClose>
                <Button variant="destructive">Suspend license</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Section>

      <Section title="Notices and empty states">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Notice title="Customer data boundary">
              Store operational relationship metadata and references only. Never production logs,
              secrets or credentials.
            </Notice>
            <Notice tone="risk" title="Cost data delayed">
              AWS cost data was last imported 3 days ago. Margin estimates may be incomplete.
            </Notice>
            <p className="text-body text-fg-secondary">
              Open the command palette with <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>
            </p>
          </div>
          <Card>
            <EmptyState
              icon={Inbox}
              title="Nothing waiting for you"
              body="You have no pending approval requests in the current scope."
              action={<Button variant="link">View decided requests</Button>}
            />
          </Card>
        </div>
      </Section>
    </main>
  );
}
