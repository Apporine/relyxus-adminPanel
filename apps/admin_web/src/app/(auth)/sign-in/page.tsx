import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  // The form reads ?next= to return the user to the page they asked for.
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
