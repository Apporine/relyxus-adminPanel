/* eslint-disable @next/next/no-html-link-for-pages -- the bar listens to plain anchor clicks; next/link needs a router jsdom does not provide. */
import { act, fireEvent, render } from "@testing-library/react";
import { NavigationProgress } from "./navigation-progress";

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));

function setup() {
  const view = render(
    <>
      <NavigationProgress />
      <a href="/customers">Customers</a>
      <a href="/#top">Top</a>
      <a href="https://example.test/">Elsewhere</a>
    </>,
  );
  const bar = () => view.container.querySelector("[class*='animate-nav']");
  return { ...view, bar };
}

describe("NavigationProgress", () => {
  beforeEach(() => {
    pathname = "/";
    window.history.replaceState(null, "", "/");
  });

  it("starts on an internal link click and completes when the route changes", () => {
    const { getByText, bar, rerender } = setup();
    expect(bar()).toBeNull();
    // jsdom does not navigate; the click alone must start the bar.
    getByText("Customers").addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(getByText("Customers"));
    expect(bar()).toHaveClass("animate-nav-progress");

    pathname = "/customers";
    rerender(
      <>
        <NavigationProgress />
        <a href="/customers">Customers</a>
      </>,
    );
    expect(bar()).toHaveClass("animate-nav-done");
    // jsdom has no AnimationEvent, so React listens for the prefixed name there.
    act(() => {
      const el = bar()!;
      el.dispatchEvent(new Event("animationend", { bubbles: true }));
      el.dispatchEvent(new Event("webkitAnimationEnd", { bubbles: true }));
    });
    expect(bar()).toBeNull();
  });

  it("ignores in-page anchors, external links and modified clicks", () => {
    const { getByText, bar } = setup();
    for (const label of ["Top", "Elsewhere", "Customers"]) {
      getByText(label).addEventListener("click", (e) => e.preventDefault());
    }
    fireEvent.click(getByText("Elsewhere"));
    fireEvent.click(getByText("Customers"), { ctrlKey: true });
    expect(bar()).toBeNull();
  });
});
