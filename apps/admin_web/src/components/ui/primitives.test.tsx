import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { EmptyState, Kbd, Notice, Skeleton } from "./feedback";
import { Field, FieldError, FieldHint, Input, Label, Select, Textarea } from "./field";
import { PageHeader } from "./page-header";
import {
  SortableHeaderCell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "./table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

describe("Table", () => {
  it("is a keyboard-focusable labelled region with an accessible table", () => {
    render(
      <Table label="Licenses">
        <TableHead>
          <TableRow>
            <TableHeaderCell>License ID</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>LIC_00421</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("region", { name: "Licenses" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("columnheader", { name: "License ID" })).toHaveAttribute(
      "scope",
      "col",
    );
    expect(screen.getByRole("cell", { name: "LIC_00421" })).toBeInTheDocument();
  });

  it("exposes sort state and delegates sorting to the parent", async () => {
    const onSort = vi.fn();
    const { rerender } = render(
      <table>
        <thead>
          <tr>
            <SortableHeaderCell direction="none" onSort={onSort}>
              Expires
            </SortableHeaderCell>
          </tr>
        </thead>
      </table>,
    );
    const header = screen.getByRole("columnheader", { name: "Expires" });
    expect(header).toHaveAttribute("aria-sort", "none");
    await userEvent.click(screen.getByRole("button", { name: "Expires" }));
    expect(onSort).toHaveBeenCalledTimes(1);

    rerender(
      <table>
        <thead>
          <tr>
            <SortableHeaderCell direction="descending" onSort={onSort}>
              Expires
            </SortableHeaderCell>
          </tr>
        </thead>
      </table>,
    );
    expect(header).toHaveAttribute("aria-sort", "descending");
  });
});

describe("form fields", () => {
  it("associates labels, hints and errors with controls", () => {
    render(
      <>
        <Field>
          <Label htmlFor="name">Legal name</Label>
          <Input id="name" aria-describedby="name-hint" />
          <FieldHint id="name-hint">As registered.</FieldHint>
        </Field>
        <Field>
          <Label htmlFor="stage">Stage</Label>
          <Select id="stage" defaultValue="b">
            <option value="a">A</option>
            <option value="b">B</option>
          </Select>
        </Field>
        <Field>
          <Label htmlFor="reason">Reason</Label>
          <Textarea id="reason" aria-invalid="true" />
          <FieldError>Enter a reason.</FieldError>
        </Field>
      </>,
    );
    expect(screen.getByLabelText("Legal name")).toHaveAccessibleDescription("As registered.");
    expect(screen.getByLabelText("Stage")).toHaveValue("b");
    expect(screen.getByLabelText("Reason")).toBeInvalid();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a reason.");
  });
});

describe("feedback", () => {
  it("renders an empty state with its next action", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No customers yet"
        body="Create the first customer."
        action={<button type="button">Create customer</button>}
      />,
    );
    expect(screen.getByText("No customers yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create customer" })).toBeInTheDocument();
  });

  it("uses note for information and status for risk notices", () => {
    render(
      <>
        <Notice title="Customer data boundary">Metadata only.</Notice>
        <Notice tone="risk" title="Cost data delayed" />
      </>,
    );
    expect(screen.getByRole("note")).toHaveTextContent("Customer data boundary");
    expect(screen.getByRole("status")).toHaveTextContent("Cost data delayed");
  });

  it("hides skeletons from assistive technology", () => {
    const { container } = render(<Skeleton className="h-4" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    render(<Kbd>K</Kbd>);
    expect(screen.getByText("K").tagName).toBe("KBD");
  });
});

describe("layout", () => {
  it("renders card sections and a page header with one h1", () => {
    render(
      <>
        <PageHeader
          title="Customers"
          description="Lifecycle"
          actions={<button type="button">Create</button>}
          meta={<span>42</span>}
        />
        <Card aria-label="Renewals">
          <CardHeader>
            <CardTitle as="h3">Renewals</CardTitle>
            <CardDescription>Next 120 days</CardDescription>
          </CardHeader>
          <CardContent>Body</CardContent>
          <CardFooter>Source</CardFooter>
        </Card>
      </>,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 3, name: "Renewals" })).toBeInTheDocument();
    expect(screen.getByText("Lifecycle")).toBeInTheDocument();
  });

  it("switches tabs", async () => {
    render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Sections">
          <TabsTrigger value="a">Overview</TabsTrigger>
          <TabsTrigger value="b">Contracts</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Overview body</TabsContent>
        <TabsContent value="b">Contracts body</TabsContent>
      </Tabs>,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Contracts" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Contracts body");
  });
});
