import { Suspense } from "react";
import { Assistant } from "@/features/assistant/assistant";
import {
  getCurrentStaff,
  getEnvironment,
  getSearchIndex,
  listApprovals,
  listProducts,
  listTasks,
} from "@/server/data";
import { CommandPalette } from "./command-palette";
import { NavigationProgress } from "./navigation-progress";
import { ShellProvider } from "./shell-state";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

/** Global shell (spec §7): Ink navigation, top bar, command palette and main region. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const [environment, staff, approvals, tasks, products, searchIndex] = await Promise.all([
    getEnvironment(),
    getCurrentStaff(),
    listApprovals(),
    listTasks(),
    listProducts(),
    getSearchIndex(),
  ]);
  const pendingApprovals = approvals.filter((a) => a.state === "pending").length;

  return (
    <ShellProvider>
      {/* useSearchParams needs a Suspense boundary to keep the shell static. */}
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <a
        href="#main-content"
        className="sr-only z-(--z-palette) rounded-control bg-violet px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        Skip to main content
      </a>
      <div className="flex min-h-dvh">
        <Sidebar environment={environment} />
        <div className="relative isolate flex min-w-0 flex-1 flex-col">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_45%,transparent)]"
          >
            <div className="absolute -inset-x-[10%] -top-1/3 h-[140%] animate-drift aurora" />
          </div>
          <TopBar
            environment={environment}
            pendingApprovals={pendingApprovals}
            tasks={tasks}
            staff={staff}
            products={products}
            assistant={
              <Suspense fallback={null}>
                <Assistant />
              </Suspense>
            }
          />
          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-(--ap-content-max-width) flex-1 px-4 py-6 outline-none md:px-8 md:py-8 [&>*]:animate-rise"
          >
            {children}
          </main>
        </div>
      </div>
      <CommandPalette index={searchIndex} />
    </ShellProvider>
  );
}
