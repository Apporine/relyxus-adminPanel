import { render, screen } from "@testing-library/react";
import {
  BoardScreenSkeleton,
  CardsScreenSkeleton,
  ContentSkeleton,
  DashboardScreenSkeleton,
  DetailScreenSkeleton,
  FormScreenSkeleton,
  ListScreenSkeleton,
  SkeletonPageHeader,
} from "./skeletons";

const shapes = (container: HTMLElement) => container.querySelectorAll(".shimmer").length;

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

  it("fall back to a generic label and a placeholder title", () => {
    const { container } = render(<ListScreenSkeleton nav={3} metrics={6} actions={0} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading screen");
    expect(container.querySelector("p.text-page-title")).toBeNull();
  });

  it("render only the regions each list asks for", () => {
    const minimal = render(<ListScreenSkeleton title="Roles" columns={3} rows={2} />);
    const full = render(
      <ListScreenSkeleton title="Audit" nav={3} filters={8} metrics={4} columns={11} rows={12} />,
    );
    expect(shapes(full.container)).toBeGreaterThan(shapes(minimal.container));
  });
});

describe("dashboard skeletons", () => {
  it("include metrics, charts and a table by default", () => {
    const { container } = render(<DashboardScreenSkeleton title="Security posture" />);
    expect(container.querySelectorAll("[style*='height']").length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent("Loading Security posture");
  });

  it("drop metrics, charts and the table when not wanted", () => {
    const bare = render(
      <DashboardScreenSkeleton nav={2} filters={2} metrics={0} charts={0} table={false} />,
    );
    expect(bare.container.querySelectorAll("[style*='height']")).toHaveLength(0);
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Loading dashboard");
  });

  it("lay out one chart and three or six metric cards", () => {
    const three = render(<DashboardScreenSkeleton title="A" metrics={3} charts={1} />);
    const six = render(<DashboardScreenSkeleton title="B" metrics={6} charts={1} />);
    expect(shapes(six.container)).toBeGreaterThan(shapes(three.container));
  });
});

describe("other screen shapes", () => {
  it("detail without a rail or tabs", () => {
    const withRail = render(<DetailScreenSkeleton label="role" />);
    const noRail = render(<DetailScreenSkeleton label="report" rail={false} />);
    expect(shapes(withRail.container)).toBeGreaterThan(shapes(noRail.container));
  });

  it("boards with and without navigation", () => {
    render(<BoardScreenSkeleton title="Onboarding" nav={4} columns={3} />);
    render(<BoardScreenSkeleton />);
    const [titled, untitled] = screen.getAllByRole("status");
    expect(titled).toHaveTextContent("Loading Onboarding");
    expect(untitled).toHaveTextContent("Loading board");
  });

  it("card grids in one, two or three columns", () => {
    for (const columns of [1, 2, 3] as const) {
      const { container, unmount } = render(
        <CardsScreenSkeleton title="Settings" nav={2} cards={columns + 1} columns={columns} />,
      );
      expect(shapes(container)).toBeGreaterThan(0);
      unmount();
    }
    render(<CardsScreenSkeleton />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading screen");
  });

  it("forms with a summary card", () => {
    render(<FormScreenSkeleton label="license request" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading license request");
  });

  it("page headers with breadcrumbs and no description", () => {
    const { container } = render(
      <SkeletonPageHeader breadcrumbs description={false} actions={2} />,
    );
    expect(shapes(container)).toBe(4);
  });
});

describe("in-page fallbacks", () => {
  it("render only the requested regions", () => {
    render(<ContentSkeleton label="settings" cards={2} table={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading settings");
  });

  it("can show metrics, charts and a table together", () => {
    const { container } = render(
      <ContentSkeleton label="audit events" metrics={4} charts={2} columns={8} />,
    );
    expect(container.querySelectorAll("[style*='height']").length).toBeGreaterThan(12);
  });
});
