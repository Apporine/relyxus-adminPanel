import { EmptyState } from "@/components/ui/feedback";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import type { DatasetField, ReportRow } from "@/domain/reports";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Formats a report value by field type; dates are stored as sortable ISO strings. */
export function formatReportValue(field: DatasetField, value: ReportRow[string] | undefined) {
  if (value === undefined || value === "") return "—";
  if (field.type === "date" && typeof value === "string" && value.length === 10) {
    return formatDate(`${value}T00:00:00Z`);
  }
  return String(value);
}

/** Result table shared by saved reports and the builder preview. */
export function ReportTable({
  label,
  result,
  limit,
}: {
  label: string;
  result: { columns: DatasetField[]; rows: ReportRow[] };
  limit?: number;
}) {
  const rows = limit ? result.rows.slice(0, limit) : result.rows;
  if (!result.rows.length) {
    return (
      <Card>
        <EmptyState
          title="No rows match"
          body="Change the filter or choose another dataset. Visibility may also depend on your role."
        />
      </Card>
    );
  }
  return (
    <Card>
      <Table label={label} className="whitespace-nowrap">
        <TableHead>
          <TableRow>
            {result.columns.map((c) => (
              <TableHeaderCell key={c.key} className={cn(c.type === "number" && "text-end")}>
                {c.label}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {result.columns.map((c) => (
                <TableCell key={c.key} className={cn(c.type === "number" && "text-end tabular")}>
                  {formatReportValue(c, row[c.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="border-t border-border px-4 py-2.5 text-micro text-fg-muted">
        {limit && result.rows.length > limit
          ? `Showing ${limit} of ${result.rows.length} rows`
          : `${result.rows.length} rows`}
      </p>
    </Card>
  );
}
