import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";

/**
 * Table view of a chart's data. Values a chart shows only on hover are always reachable
 * here, so tooltips enhance and never gate.
 */
export function ChartTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <details className="group mt-3 text-dense">
      <summary className="inline-flex cursor-pointer items-center gap-1 rounded-control text-micro font-medium text-fg-muted hover:text-fg">
        <span className="group-open:hidden">View as table</span>
        <span className="hidden group-open:inline">Hide table</span>
      </summary>
      <div className="mt-2 rounded-control border border-border">
        <Table label={caption}>
          <TableHead>
            <TableRow>
              {columns.map((column, index) => (
                <TableHeaderCell key={column} className={index > 0 ? "text-end" : undefined}>
                  {column}
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={String(row[0])}>
                {row.map((cell, index) => (
                  <TableCell key={index} className={index > 0 ? "text-end" : "text-fg"}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}
