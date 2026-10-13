"use client";

import { Lock, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { DesignPreviewDialog } from "@/components/shell/design-preview-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Label, Select } from "@/components/ui/field";
import { runReport, type RestrictedDataset } from "@/domain/reports";
import type { DatasetKey } from "@/domain/types";
import { ReportTable } from "./report-table";

const requiresLabel = {
  commercial: "Needs finance or commercial scope",
  security: "Needs Security Administrator or Auditor",
};

/**
 * Report builder (spec §26): approved datasets and fields only. Rows arrive from the
 * server without restricted fields, which appear here locked with the reason.
 */
export function ReportBuilder({ datasets }: { datasets: Record<DatasetKey, RestrictedDataset> }) {
  const keys = Object.keys(datasets) as DatasetKey[];
  const [datasetKey, setDatasetKey] = useState<DatasetKey>(keys[0]!);
  const dataset = datasets[datasetKey];
  const [columns, setColumns] = useState<string[]>(() =>
    dataset.fields.slice(0, 4).map((f) => f.key),
  );
  const [filterField, setFilterField] = useState("");
  const [filterText, setFilterText] = useState("");
  const [sortField, setSortField] = useState("");
  const [direction, setDirection] = useState<"ascending" | "descending">("ascending");

  function chooseDataset(key: DatasetKey) {
    setDatasetKey(key);
    setColumns(datasets[key].fields.slice(0, 4).map((f) => f.key));
    setFilterField("");
    setFilterText("");
    setSortField("");
  }

  const result = useMemo(
    () =>
      runReport(dataset, {
        // Keep the dataset's field order whatever order columns were ticked in.
        columns: dataset.fields.map((f) => f.key).filter((k) => columns.includes(k)),
        filter: filterField ? { field: filterField, contains: filterText } : undefined,
        sort: sortField ? { field: sortField, direction } : undefined,
      }),
    [dataset, columns, filterField, filterText, sortField, direction],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[20rem_1fr]">
      <Card aria-labelledby="builder-title" className="self-start">
        <CardHeader>
          <CardTitle id="builder-title">Build a report</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <Label htmlFor="builder-dataset">Dataset</Label>
            <Select
              id="builder-dataset"
              value={datasetKey}
              onChange={(e) => chooseDataset(e.target.value as DatasetKey)}
            >
              {keys.map((k) => (
                <option key={k} value={k}>
                  {datasets[k].label}
                </option>
              ))}
            </Select>
            <p className="text-micro text-fg-muted">{dataset.description}</p>
          </Field>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-micro font-medium text-fg-muted">Columns</legend>
            {dataset.fields.map((f) => (
              <label key={f.key} className="flex min-h-6 items-center gap-2 text-dense text-fg">
                <input
                  type="checkbox"
                  checked={columns.includes(f.key)}
                  onChange={(e) =>
                    setColumns((current) =>
                      e.target.checked ? [...current, f.key] : current.filter((c) => c !== f.key),
                    )
                  }
                  className="size-4 accent-violet"
                />
                {f.label}
                {f.classification !== "Internal" ? (
                  <span className="text-micro text-fg-muted">{f.classification}</span>
                ) : null}
              </label>
            ))}
            {dataset.locked.map((f) => (
              <label
                key={f.key}
                className="flex min-h-6 items-center gap-2 text-dense text-fg-muted"
              >
                <input type="checkbox" disabled className="size-4" />
                <Lock aria-hidden="true" className="size-3.5" />
                {f.label}
                <span className="text-micro">{f.requires ? requiresLabel[f.requires] : ""}</span>
              </label>
            ))}
          </fieldset>

          <Field>
            <Label htmlFor="builder-filter-field">Filter field</Label>
            <Select
              id="builder-filter-field"
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
            >
              <option value="">No filter</option>
              {dataset.fields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
          {filterField ? (
            <Field>
              <Label htmlFor="builder-filter-text">Contains</Label>
              <Input
                id="builder-filter-text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </Field>
          ) : null}

          <Field>
            <Label htmlFor="builder-sort">Sort by</Label>
            <Select
              id="builder-sort"
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
            >
              <option value="">Dataset order</option>
              {dataset.fields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
          {sortField ? (
            <Field>
              <Label htmlFor="builder-direction">Direction</Label>
              <Select
                id="builder-direction"
                value={direction}
                onChange={(e) => setDirection(e.target.value as "ascending" | "descending")}
              >
                <option value="ascending">Ascending</option>
                <option value="descending">Descending</option>
              </Select>
            </Field>
          ) : null}

          <DesignPreviewDialog
            trigger="Save report"
            triggerVariant="primary"
            triggerIcon={<Save aria-hidden="true" />}
            title="Save report"
            description="Saved reports keep the dataset, columns, filter and sort. Team reports show each viewer only the fields they may see."
            confirmLabel="Save report"
          >
            <Field>
              <Label htmlFor="save-report-name">Name</Label>
              <Input id="save-report-name" name="name" required />
            </Field>
            <Field>
              <Label htmlFor="save-report-visibility">Share with</Label>
              <Select id="save-report-visibility" name="visibility" defaultValue="private">
                <option value="private">Only me</option>
                <option value="team">My team</option>
              </Select>
            </Field>
          </DesignPreviewDialog>
        </CardContent>
      </Card>

      <section aria-label="Preview" className="flex min-w-0 flex-col gap-2">
        <p className="text-dense text-fg-muted" aria-live="polite">
          {result.columns.length
            ? `${result.rows.length} rows match`
            : "Choose at least one column"}
        </p>
        {result.columns.length ? (
          <ReportTable label="Report preview" result={result} limit={25} />
        ) : null}
      </section>
    </div>
  );
}
