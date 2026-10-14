import { render, screen } from "@testing-library/react";
import { ContentSkeleton, DetailScreenSkeleton, ListScreenSkeleton } from "./skeletons";

describe("screen skeletons", () => {
  it("announce the load once and show the real title", () => {
    render(<ListScreenSkeleton title="Customers" filters={3} columns={5} rows={4} />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Loading Customers");
    expect(screen.getByText("Customers", { selector: "p" })).toBeVisible();
  });

  it("keep the decorative shapes out of the accessibility tree", () => {
    const { container } = render(<DetailScreenSkeleton label="customer" tabs={4} metrics={3} />);
    const blocks = [...container.querySelectorAll(".shimmer")];
    expect(blocks.length).toBeGreaterThan(20);
    for (const block of blocks) expect(block.closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Loading customer");
  });

  it("render only the requested regions for in-page fallbacks", () => {
    render(<ContentSkeleton label="settings" cards={2} table={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading settings");
  });
});
