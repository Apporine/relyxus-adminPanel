import type { Metadata } from "next";
import { SignInForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return <SignInForm />;
}
