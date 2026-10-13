import { History } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { approvalType } from "@/domain/status";
import { formatTimestamp } from "@/lib/format";
import { ApprovalStateBadge, StaffName } from "./approval-parts";
import { loadMyDecisions } from "./load";

/** Decisions made by the current staff member (spec §30.1 My decisions). */
export async function MyDecisions() {
  const data = await loadMyDecisions();
  if (data.items.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No decisions yet"
        body="Requests you approve or reject appear here with your reason."
        className="rounded-card border border-dashed border-border-strong bg-surface"
      />
    );
  }
  return (
    <Card className="overflow-hidden">
      <Table label="My decisions">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Decided</TableHeaderCell>
            <TableHeaderCell>Request</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Requester</TableHeaderCell>
            <TableHeaderCell>Decision</TableHeaderCell>
            <TableHeaderCell>Reason</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.items.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="whitespace-nowrap">
                {request.decidedAt ? formatTimestamp(request.decidedAt) : "—"}
              </TableCell>
              <TableCell>
                <Link
                  href={`/approvals/${request.id}`}
                  className="font-medium text-fg hover:text-violet-text hover:underline"
                >
                  {request.title}
                </Link>
                <span className="block font-mono text-micro text-fg-muted">{request.id}</span>
              </TableCell>
              <TableCell className="whitespace-nowrap">{approvalType[request.type]}</TableCell>
              <TableCell className="whitespace-nowrap">
                <StaffName staff={data.staff} id={request.requesterId} />
              </TableCell>
              <TableCell>
                <ApprovalStateBadge request={request} state={request.state} now={data.now} />
              </TableCell>
              <TableCell className="min-w-64">{request.decisionReason}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function MyDecisionsSkeleton() {
  return <Skeleton className="h-48 rounded-card" aria-busy="true" />;
}
