import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Asserts the current page has no WCAG 2.2 AA violations (spec §32). */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.map(({ id, help, nodes }) => ({
      id,
      help,
      targets: nodes.map((n) => n.target),
    })),
  ).toEqual([]);
}
