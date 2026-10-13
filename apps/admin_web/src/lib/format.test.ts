import {
  daysUntil,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  formatPercent,
  formatRelativeDays,
  formatRelativeTime,
  formatTimestamp,
  formatMoneyList,
  plural,
} from "./format";

const NOW = "2026-10-13T09:00:00Z";

describe("money", () => {
  it("formats compact values for dashboards", () => {
    expect(formatMoneyCompact({ amountMinor: 482_000_000, currency: "GBP" })).toBe("£4.8m");
    expect(formatMoneyCompact({ amountMinor: 64_000_000, currency: "USD" })).toBe("US$640k");
  });

  it("formats full values without minor units", () => {
    expect(formatMoney({ amountMinor: 18_500_000, currency: "GBP" })).toBe("£185,000");
  });
});

describe("dates", () => {
  it("formats calendar dates in UTC", () => {
    expect(formatDate("2027-03-31T23:30:00Z")).toBe("31 Mar 2027");
  });

  it("always includes the timezone on timestamps", () => {
    expect(formatTimestamp("2026-10-12T16:05:00Z")).toBe("12 Oct 2026, 16:05 UTC");
  });

  it("counts days until a date, negative when past", () => {
    expect(daysUntil("2026-10-23T09:00:00Z", NOW)).toBe(10);
    expect(daysUntil("2026-10-10T09:00:00Z", NOW)).toBe(-3);
  });

  it("describes relative days", () => {
    expect(formatRelativeDays("2026-10-13T12:00:00Z", NOW)).toBe("tomorrow");
    expect(formatRelativeDays("2026-10-13T09:00:00Z", NOW)).toBe("today");
    expect(formatRelativeDays("2026-10-25T09:00:00Z", NOW)).toBe("in 12 days");
  });

  it("describes recent activity", () => {
    expect(formatRelativeTime("2026-10-13T08:40:00Z", NOW)).toBe("20 minutes ago");
    expect(formatRelativeTime("2026-10-13T06:00:00Z", NOW)).toBe("3 hours ago");
    expect(formatRelativeTime("2026-10-10T09:00:00Z", NOW)).toBe("3 days ago");
  });
});

it("formats percentages", () => {
  expect(formatPercent(0.1234, 1)).toBe("12.3%");
});

it("pluralises counts", () => {
  expect(plural(1, "deployment")).toBe("1 deployment");
  expect(plural(1200, "customer")).toBe("1,200 customers");
});

it("lists per-currency totals", () => {
  expect(formatMoneyList([])).toBe("—");
  expect(
    formatMoneyList([
      { amountMinor: 120_000_000, currency: "EUR" },
      { amountMinor: 56_000_000, currency: "GBP" },
    ]),
  ).toBe("€1.2m · £560k");
});
