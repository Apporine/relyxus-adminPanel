import type { Metadata } from "next";
import { Suspense } from "react";
import { SsoForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Single sign-on" };

export default function Page() {
  // The form reads ?next= to return the user to the page they asked for.
  return (
    <Suspense fallback={null}>
      <SsoForm />
    </Suspense>
  );
}
