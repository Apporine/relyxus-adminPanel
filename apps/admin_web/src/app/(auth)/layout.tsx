import { FileCheck2, KeyRound, ShieldCheck } from "lucide-react";
import { ApporineMark } from "@/components/shell/apporine-mark";

const assurances = [
  { icon: ShieldCheck, text: "Staff access only. Accounts are provisioned by your administrator." },
  {
    icon: KeyRound,
    text: "Multi-factor authentication on every sign in; step-up for sensitive actions.",
  },
  { icon: FileCheck2, text: "Every sign in and administrative action is recorded in audit." },
];

/** Sign in screens: the Ink brand panel beside the form, outside the console shell. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside
        aria-label="About the Apporine control plane"
        className="relative hidden flex-col justify-between overflow-hidden bg-nav nav-glow p-10 lg:flex"
      >
        <div className="flex items-center gap-3">
          <ApporineMark className="size-9" />
          <div className="leading-tight">
            <p className="text-card-title text-nav-fg">Apporine</p>
            <p className="text-micro text-nav-fg-muted">Control plane</p>
          </div>
        </div>
        <div className="flex max-w-md flex-col gap-6">
          <p className="text-[2rem] leading-tight font-semibold text-nav-fg">
            Customers, licenses and deployments across every Apporine product, in one governed
            place.
          </p>
          <ul className="flex flex-col gap-3">
            {assurances.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-body text-nav-fg-muted">
                <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-cyan" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-micro text-nav-fg-muted">
          Internal system. Unauthorized access is prohibited and monitored.
        </p>
      </aside>
      <main
        id="main-content"
        className="relative isolate flex items-center justify-center px-4 py-12 sm:px-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -inset-x-[10%] -top-1/4 h-2/3 aurora" />
        </div>
        <div className="w-full max-w-sm animate-rise">{children}</div>
      </main>
    </div>
  );
}
