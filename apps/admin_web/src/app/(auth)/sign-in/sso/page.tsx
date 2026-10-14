import type { Metadata } from "next";
import { SsoForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Single sign-on" };

export default function Page() {
  return <SsoForm />;
}
