import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { StatusBadge } from "./badge";
import { Button } from "./button";
import { CopyableId } from "./copyable-id";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";
import { MetricCard } from "./metric-card";

describe("Button", () => {
  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Save view</Button>);
    expect(screen.getByRole("button", { name: "Save view" })).toHaveAttribute("type", "button");
  });

  it("renders its child with button styling when asChild is set", () => {
    render(
      <Button asChild variant="primary">
        <Link href="/customers/new">Create customer</Link>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Create customer" });
    expect(link).toHaveClass("bg-violet");
    expect(link).not.toHaveAttribute("type");
  });
});

describe("StatusBadge", () => {
  it("carries meaning in text, with a decorative icon", () => {
    const { container } = render(<StatusBadge tone="risk" label="At risk" />);
    expect(screen.getByText("At risk")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("CopyableId", () => {
  it("copies the full value and announces it", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<CopyableId value="sha256:9f2c4e1b7a3d5c8e0f6a" label="Payload hash" truncate />);

    expect(screen.getByText("sha256:9f2c4…8e0f6a")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy Payload hash" }));

    expect(writeText).toHaveBeenCalledWith("sha256:9f2c4e1b7a3d5c8e0f6a");
    expect(await screen.findByRole("button", { name: "Payload hash copied" })).toBeInTheDocument();
  });
});

describe("DialogContent", () => {
  function renderDialog(dismissible: boolean) {
    render(
      <Dialog>
        <DialogTrigger>Revoke license</DialogTrigger>
        <DialogContent title="Revoke license" description="High impact." dismissible={dismissible}>
          <p>Body</p>
        </DialogContent>
      </Dialog>,
    );
  }

  it("is labelled by its title and description", async () => {
    const user = userEvent.setup();
    renderDialog(true);
    await user.click(screen.getByRole("button", { name: "Revoke license" }));
    const dialog = screen.getByRole("dialog", { name: "Revoke license" });
    expect(dialog).toHaveAccessibleDescription("High impact.");
  });

  it("ignores Escape when not dismissible", async () => {
    const user = userEvent.setup();
    renderDialog(false);
    await user.click(screen.getByRole("button", { name: "Revoke license" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger when dismissible", async () => {
    const user = userEvent.setup();
    renderDialog(true);
    const trigger = screen.getByRole("button", { name: "Revoke license" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe("MetricCard", () => {
  it("shows the value with a drill-through link", () => {
    render(
      <MetricCard
        label="Active customers"
        value="42"
        href="/customers"
        source="Active customers"
      />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View records for Active customers/ })).toHaveAttribute(
      "href",
      "/customers",
    );
  });

  it("hides the value and link when restricted", () => {
    render(
      <MetricCard
        label="Annual contract value"
        value="£4.82M"
        href="/commercial"
        source="Contracts"
        restricted
      />,
    );
    expect(screen.queryByText("£4.82M")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Requires finance scope")).toBeInTheDocument();
  });
});
