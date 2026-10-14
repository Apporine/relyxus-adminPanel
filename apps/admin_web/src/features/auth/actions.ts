"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext, SESSION_COOKIE } from "./session";

/**
 * Starts a design-track preview session and opens the requested page. No credentials
 * reach the server: the form sends only where to go next. The Control API replaces this
 * with the OIDC flow in platform phase 1.
 */
export async function startPreviewSession(next: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, "preview", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  redirect(safeNext(next));
}

export async function signOut() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/sign-in");
}
