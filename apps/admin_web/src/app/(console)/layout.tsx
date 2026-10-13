import { AppShell } from "@/components/shell/app-shell";

export default function ConsoleLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
