import { ShieldCheck, ShieldOff, TimerReset, UserRoundX } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DescriptionList } from "@/components/ui/description-list";
import { Notice } from "@/components/ui/feedback";
import { Field, FieldHint, Label, Select, Textarea } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import {
  conflictingRoles,
  effectiveRoles,
  fourEyesActions,
  isPrivileged,
  isStaleAccount,
  roleConflicts,
  roleDefinitions,
  unusedRoles,
} from "@/domain/security";
import { roleName } from "@/domain/status";
import type { RoleKey, StaffUser } from "@/domain/types";
import { cn } from "@/lib/cn";
import { formatDate, formatRelativeTime, formatTimestamp, plural } from "@/lib/format";
import { loadSecurity, type SecurityData } from "./load";

const roleKeys = Object.keys(roleDefinitions) as RoleKey[];

function isRoleKey(value: string): value is RoleKey {
  return (roleKeys as string[]).includes(value);
}

function staffFlags(person: StaffUser, data: SecurityData) {
  const access = data.accessById[person.id];
  const roles = effectiveRoles(person, access, data.now);
  return {
    roles,
    privileged: isPrivileged(roles),
    conflicts: roleConflicts(roles),
    stale: isStaleAccount(person, data.now),
    unused: unusedRoles(person, access, data.now),
    noMfa: !person.mfaEnabled || access?.authMethod === "Password only",
    expiredGrants: (access?.temporaryGrants ?? []).filter(
      (g) => !g.removedAt && Date.parse(g.expiresAt) <= Date.parse(data.now),
    ),
  };
}

/**
 * Staff access directory (spec §23): identity source, roles, scopes, MFA, last sign in,
 * sessions and privileged grants. `?person=` opens one account's access detail.
 */
export async function StaffAccessList({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [data, params] = await Promise.all([loadSecurity(), searchParams]);
  const selectedId = typeof params.person === "string" ? params.person : undefined;
  const selected = data.staff.find((s) => s.id === selectedId);
  const rows = [...data.staff].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-4">
      {selected ? <StaffAccessDetail person={selected} data={data} /> : null}
      <Card>
        <Table label="Staff access" className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Staff</TableHeaderCell>
              <TableHeaderCell>Identity</TableHeaderCell>
              <TableHeaderCell>Roles</TableHeaderCell>
              <TableHeaderCell>Scope</TableHeaderCell>
              <TableHeaderCell>MFA</TableHeaderCell>
              <TableHeaderCell>Last sign in</TableHeaderCell>
              <TableHeaderCell className="text-end">Sessions</TableHeaderCell>
              <TableHeaderCell>Attention</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((person) => {
              const access = data.accessById[person.id];
              const flags = staffFlags(person, data);
              const attention = [
                ...flags.conflicts.map(() => "Role conflict"),
                ...(flags.expiredGrants.length ? ["Expired grant"] : []),
                ...(flags.stale ? ["Stale account"] : []),
                ...(!flags.stale && flags.unused.length ? ["Unused role"] : []),
                ...((access?.failedSignIns30d ?? 0) >= 5 ? ["Failed sign ins"] : []),
              ];
              return (
                <TableRow
                  key={person.id}
                  aria-current={person.id === selectedId ? "true" : undefined}
                  className={cn(person.id === selectedId && "bg-violet-subtle/50")}
                >
                  <TableCell>
                    <Link
                      href={`/security/staff?person=${person.id}`}
                      scroll={false}
                      className="font-medium text-fg hover:text-violet-text hover:underline"
                    >
                      {person.name}
                    </Link>
                    <span className="block text-micro text-fg-muted">{person.title}</span>
                  </TableCell>
                  <TableCell>
                    {access?.identitySource ?? "—"}
                    <span className="block text-micro text-fg-muted">{access?.authMethod}</span>
                  </TableCell>
                  <TableCell>
                    <span className="flex max-w-80 flex-wrap gap-1">
                      {flags.roles.map((role) => (
                        <Tag
                          key={role}
                          className={cn(
                            roleDefinitions[role].privileged && "bg-violet-subtle text-violet-text",
                          )}
                        >
                          {roleName[role]}
                          {person.roles.includes(role) ? "" : " · temporary"}
                        </Tag>
                      ))}
                    </span>
                  </TableCell>
                  <TableCell className="text-fg-secondary">
                    {person.productScope.length ? person.productScope.join(", ") : "All products"}
                  </TableCell>
                  <TableCell>
                    {flags.noMfa ? (
                      <StatusBadge tone="critical" label="No MFA" icon={ShieldOff} />
                    ) : (
                      <StatusBadge tone="healthy" label="Enabled" icon={ShieldCheck} />
                    )}
                  </TableCell>
                  <TableCell className={cn(flags.stale && "font-medium text-coral-text")}>
                    {formatRelativeTime(person.lastSignInAt, data.now)}
                  </TableCell>
                  <TableCell className="text-end tabular">{access?.activeSessions ?? 0}</TableCell>
                  <TableCell>
                    {attention.length ? (
                      <span className="flex flex-wrap gap-1">
                        {[...new Set(attention)].map((a) => (
                          <StatusBadge key={a} tone="risk" label={a} />
                        ))}
                      </span>
                    ) : (
                      <span className="text-fg-muted">None</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function StaffAccessDetail({ person, data }: { person: StaffUser; data: SecurityData }) {
  const access = data.accessById[person.id];
  const flags = staffFlags(person, data);

  return (
    <Card aria-labelledby="staff-detail-title">
      <CardHeader>
        <div>
          <CardTitle id="staff-detail-title">{person.name}</CardTitle>
          <CardDescription>
            {person.title} · {person.email}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <DesignPreviewDialog
            trigger="Request elevation"
            triggerSize="sm"
            triggerIcon={<TimerReset aria-hidden="true" />}
            title="Request time limited elevation"
            description="Elevation is time limited, audited and needs a second approver. Prefer it to a permanent role."
            confirmLabel="Request elevation"
          >
            <Field>
              <Label htmlFor="elevate-role">Role</Label>
              <Select id="elevate-role" name="role" required defaultValue="">
                <option value="" disabled>
                  Choose a role
                </option>
                {roleKeys
                  .filter((r) => !person.roles.includes(r))
                  .map((r) => (
                    <option key={r} value={r}>
                      {roleName[r]}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="elevate-duration">Duration</Label>
              <Select id="elevate-duration" name="duration" defaultValue="8h">
                <option value="4h">4 hours</option>
                <option value="8h">8 hours</option>
                <option value="7d">7 days</option>
              </Select>
              <FieldHint>The grant is removed automatically when it expires.</FieldHint>
            </Field>
            <Field>
              <Label htmlFor="elevate-reason">Reason</Label>
              <Textarea id="elevate-reason" name="reason" required />
            </Field>
          </DesignPreviewDialog>
          <DesignPreviewDialog
            trigger="Suspend access"
            triggerSize="sm"
            triggerIcon={<UserRoundX aria-hidden="true" />}
            title="Suspend staff access"
            description="Suspension ends active sessions and blocks sign in. Role assignments stay recorded for review."
            confirmLabel="Suspend access"
            confirmVariant="destructive"
          >
            <Field>
              <Label htmlFor="suspend-reason">Reason</Label>
              <Textarea id="suspend-reason" name="reason" required />
            </Field>
          </DesignPreviewDialog>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {flags.conflicts.map((c) => (
          <Notice
            key={c.roles.join("-")}
            tone="risk"
            title={`Conflicting roles: ${c.roles.map((r) => roleName[r]).join(" and ")}`}
          >
            {c.reason}
          </Notice>
        ))}
        <DescriptionList
          columns={2}
          items={[
            { term: "Identity source", value: access?.identitySource },
            { term: "Authentication", value: access?.authMethod },
            { term: "Last sign in", value: formatTimestamp(person.lastSignInAt) },
            { term: "Active sessions", value: String(access?.activeSessions ?? 0) },
            { term: "Failed sign ins (30 days)", value: String(access?.failedSignIns30d ?? 0) },
            {
              term: "Product scope",
              value: person.productScope.length ? person.productScope.join(", ") : "All products",
            },
          ]}
        />
        <Table label={`Role use for ${person.name}`} className="whitespace-nowrap">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>Assignment</TableHeaderCell>
              <TableHeaderCell>Last used</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {person.roles.map((role) => {
              const last = access?.roleLastUsedAt[role];
              return (
                <TableRow key={role}>
                  <TableCell>
                    <Link
                      href={`/security/roles/${role}`}
                      className="font-medium text-fg hover:text-violet-text hover:underline"
                    >
                      {roleName[role]}
                    </Link>
                  </TableCell>
                  <TableCell>Standing</TableCell>
                  <TableCell
                    className={cn(flags.unused.includes(role) && "font-medium text-coral-text")}
                  >
                    {last ? formatRelativeTime(last, data.now) : "Never used"}
                    {flags.unused.includes(role) ? " · unused" : ""}
                  </TableCell>
                </TableRow>
              );
            })}
            {(access?.temporaryGrants ?? []).map((g) => {
              const expired = Date.parse(g.expiresAt) <= Date.parse(data.now);
              return (
                <TableRow key={`${g.role}-${g.grantedAt}`}>
                  <TableCell>
                    {roleName[g.role]}
                    <span className="block text-micro text-fg-muted">{g.reason}</span>
                  </TableCell>
                  <TableCell>
                    Temporary, granted by {data.directory[g.grantedById]?.name}
                    {g.approvalId ? ` · ${g.approvalId}` : ""}
                  </TableCell>
                  <TableCell
                    className={cn(expired && !g.removedAt && "font-medium text-coral-text")}
                  >
                    {g.removedAt
                      ? `Removed ${formatDate(g.removedAt)}`
                      : expired
                        ? `Expired ${formatDate(g.expiresAt)}, still assigned`
                        : `Until ${formatTimestamp(g.expiresAt)}`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/** Role catalog (spec §5): rights, restrictions and who holds each role. */
export async function RoleCatalog() {
  const data = await loadSecurity();
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Table label="Roles">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>Typical rights</TableHeaderCell>
              <TableHeaderCell>Sensitive restrictions</TableHeaderCell>
              <TableHeaderCell className="text-end">Members</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roleKeys.map((role) => {
              const members = data.staff.filter((s) =>
                effectiveRoles(s, data.accessById[s.id], data.now).includes(role),
              );
              return (
                <TableRow key={role}>
                  <TableCell className="whitespace-nowrap">
                    <Link
                      href={`/security/roles/${role}`}
                      className="font-medium text-fg hover:text-violet-text hover:underline"
                    >
                      {roleName[role]}
                    </Link>
                    {roleDefinitions[role].privileged ? (
                      <Tag className="ms-2 bg-violet-subtle text-violet-text">Privileged</Tag>
                    ) : null}
                  </TableCell>
                  <TableCell className="min-w-64 text-fg-secondary">
                    {roleDefinitions[role].rights}
                  </TableCell>
                  <TableCell className="min-w-64 text-fg-secondary">
                    {roleDefinitions[role].restriction}
                  </TableCell>
                  <TableCell className="text-end tabular">{members.length}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      <Card aria-labelledby="four-eyes-title">
        <CardHeader>
          <CardTitle id="four-eyes-title">Four eyes approval</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-body text-fg-secondary">
            These actions support a second approver; the requester can never approve their own
            request where segregation of duties applies.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {fourEyesActions.map((a) => (
              <li key={a}>
                <Tag>{a}</Tag>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

/** Role detail: rights, restrictions, members with last use, and conflicting roles. */
export async function RoleDetail({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!isRoleKey(role)) notFound();
  const data = await loadSecurity();
  const definition = roleDefinitions[role];
  const members = data.staff.filter((s) =>
    effectiveRoles(s, data.accessById[s.id], data.now).includes(role),
  );
  const conflicts = conflictingRoles.filter((c) => c.roles.includes(role));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Security", href: "/security" },
            { label: "Roles", href: "/security/roles" },
            { label: roleName[role] },
          ]}
        />
        <PageHeader
          title={roleName[role]}
          description={definition.rights}
          meta={
            <>
              {definition.privileged ? (
                <StatusBadge tone="info" label="Privileged" />
              ) : (
                <StatusBadge label="Standard" />
              )}
              <Tag>{plural(members.length, "member")}</Tag>
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card aria-labelledby="members-title">
          <CardHeader>
            <CardTitle id="members-title">Members</CardTitle>
          </CardHeader>
          {members.length ? (
            <Table label={`${roleName[role]} members`} className="whitespace-nowrap">
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Staff</TableHeaderCell>
                  <TableHeaderCell>Assignment</TableHeaderCell>
                  <TableHeaderCell>Last used</TableHeaderCell>
                  <TableHeaderCell>Last sign in</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((person) => {
                  const access = data.accessById[person.id];
                  const last = access?.roleLastUsedAt[role];
                  const standing = person.roles.includes(role);
                  const unused = standing && unusedRoles(person, access, data.now).includes(role);
                  return (
                    <TableRow key={person.id}>
                      <TableCell>
                        <Link
                          href={`/security/staff?person=${person.id}`}
                          className="font-medium text-fg hover:text-violet-text hover:underline"
                        >
                          {person.name}
                        </Link>
                        <span className="block text-micro text-fg-muted">{person.title}</span>
                      </TableCell>
                      <TableCell>{standing ? "Standing" : "Temporary"}</TableCell>
                      <TableCell className={cn(unused && "font-medium text-coral-text")}>
                        {last ? formatRelativeTime(last, data.now) : "Never used"}
                        {unused ? " · unused" : ""}
                      </TableCell>
                      <TableCell>{formatRelativeTime(person.lastSignInAt, data.now)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <CardContent>
              <p className="text-body text-fg-muted">Nobody holds this role.</p>
            </CardContent>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card aria-labelledby="restriction-title">
            <CardHeader>
              <CardTitle id="restriction-title">Sensitive restrictions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-body text-fg-secondary">{definition.restriction}</p>
            </CardContent>
          </Card>
          <Card aria-labelledby="conflicts-title">
            <CardHeader>
              <CardTitle id="conflicts-title">Conflicting roles</CardTitle>
            </CardHeader>
            <CardContent>
              {conflicts.length ? (
                <ul className="flex flex-col gap-3">
                  {conflicts.map((c) => {
                    const other = c.roles.find((r) => r !== role)!;
                    return (
                      <li key={other}>
                        <Link
                          href={`/security/roles/${other}`}
                          className="text-dense font-medium text-fg hover:text-violet-text hover:underline"
                        >
                          {roleName[other]}
                        </Link>
                        <p className="text-micro text-fg-muted">{c.reason}</p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-body text-fg-muted">No segregation of duties conflicts.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
