import "server-only";

import { canViewCommercial } from "@/domain/customers";
import { economics, marginRanges, type AllocationView } from "@/domain/finance";
import {
  getCurrentStaff,
  getFinanceInputs,
  getReferenceTime,
  listContracts,
  listCostSnapshots,
  listCustomers,
  listProducts,
} from "@/server/data";

type Params = Record<string, string | string[] | undefined>;

const views: AllocationView[] = ["by_value", "even", "direct"];

/** One snapshot for finance screens (spec §22); permission decided once here. */
export async function loadFinance(params: Params = {}) {
  const [now, me, customers, products, contracts, inputs, snapshots] = await Promise.all([
    getReferenceTime(),
    getCurrentStaff(),
    listCustomers(),
    listProducts(),
    listContracts(),
    getFinanceInputs(),
    listCostSnapshots(),
  ]);
  const raw = Array.isArray(params.allocation) ? params.allocation[0] : params.allocation;
  const view = views.find((v) => v === raw) ?? "by_value";
  const input = {
    customers,
    lines: inputs.lines,
    time: inputs.time,
    labor: inputs.labor,
    fx: inputs.fx,
  };
  const { rows, unallocatedMonthly } = economics(input, view);

  return {
    now,
    canView: canViewCommercial(me),
    customers,
    customerById: Object.fromEntries(customers.map((c) => [c.id, c])),
    products,
    productName: Object.fromEntries(products.map((p) => [p.id, p.name])) as Record<string, string>,
    contracts,
    ...inputs,
    snapshots,
    view,
    rows,
    unallocatedMonthly,
    ranges: marginRanges(input),
  };
}

export type FinanceData = Awaited<ReturnType<typeof loadFinance>>;
