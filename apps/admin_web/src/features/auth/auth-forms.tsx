"use client";

import { ArrowLeft, ArrowRight, Building2, Eye, EyeOff, LogIn } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ApporineMark } from "@/components/shell/apporine-mark";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { Field, FieldError, FieldHint, Input, Label } from "@/components/ui/field";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The identity provider used for single sign-on (spec §28: identity source). */
const PROVIDER = "Microsoft Entra ID";

function AuthHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8 flex flex-col gap-2">
      {/* The brand panel is hidden on small screens, so the mark appears here. */}
      <div className="mb-4 flex items-center gap-2.5 lg:hidden">
        <ApporineMark className="size-8" />
        <span className="text-card-title text-fg">Apporine</span>
      </div>
      <h1 className="text-page-title text-fg">{title}</h1>
      <p className="text-body text-fg-muted">{description}</p>
    </div>
  );
}

/** Design-track outcome: the form validates, then says plainly that nothing was sent. */
function NotConnected({ action }: { action: string }) {
  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <Notice title="Identity provider not connected">
        {action} is a design preview. No credentials were sent or stored.
      </Notice>
      <Button asChild variant="primary" className="w-full">
        <Link href="/">
          Continue to the console preview
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

function NoSignUp() {
  return (
    <p className="mt-8 text-center text-micro text-fg-muted">
      There is no self-service sign-up. Accounts are provisioned by your administrator; ask the
      security team for access.
    </p>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-micro text-fg-muted" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Email and password sign in, with single sign-on as the alternative. No sign-up. */
export function SignInForm() {
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const next: typeof errors = {};
    if (!email) next.email = "Enter your work email.";
    else if (!EMAIL.test(email)) next.email = "Enter an email address like name@company.com.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (next.email) emailRef.current?.focus();
    else if (next.password) passwordRef.current?.focus();
    else setSubmitted(true);
  }

  return (
    <>
      <AuthHeading
        title="Sign in"
        description="Use your Apporine work account to open the control plane."
      />
      {submitted ? (
        <NotConnected action="Signing in" />
      ) : (
        <>
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4" aria-label="Sign in">
            <Field>
              <Label htmlFor="sign-in-email">Work email</Label>
              <Input
                ref={emailRef}
                id="sign-in-email"
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                required
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? "sign-in-email-error" : undefined}
              />
              {errors.email ? (
                <FieldError id="sign-in-email-error">{errors.email}</FieldError>
              ) : null}
            </Field>
            <Field>
              <Label htmlFor="sign-in-password">Password</Label>
              <div className="relative">
                <Input
                  ref={passwordRef}
                  id="sign-in-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="pe-10"
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? "sign-in-password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute end-1 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-control text-fg-muted hover:bg-surface-hover hover:text-fg"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="size-4" />
                  ) : (
                    <Eye aria-hidden="true" className="size-4" />
                  )}
                </button>
              </div>
              {errors.password ? (
                <FieldError id="sign-in-password-error">{errors.password}</FieldError>
              ) : (
                <FieldHint>You will confirm with multi-factor authentication next.</FieldHint>
              )}
            </Field>
            <Button type="submit" variant="primary" className="mt-2 w-full">
              <LogIn aria-hidden="true" />
              Sign in
            </Button>
          </form>
          <Divider />
          <Button asChild className="w-full">
            <Link href="/sign-in/sso">
              <Building2 aria-hidden="true" />
              Sign in with SSO
            </Link>
          </Button>
        </>
      )}
      <NoSignUp />
    </>
  );
}

/** Single sign-on through the organization's identity provider. */
export function SsoForm() {
  const [error, setError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    const message = !email
      ? "Enter your work email."
      : !EMAIL.test(email)
        ? "Enter an email address like name@company.com."
        : undefined;
    setError(message);
    if (message) emailRef.current?.focus();
    else setSubmitted(true);
  }

  return (
    <>
      <AuthHeading
        title="Single sign-on"
        description={`Sign in through your organization's identity provider, ${PROVIDER}.`}
      />
      {submitted ? (
        <NotConnected action={`Redirecting to ${PROVIDER}`} />
      ) : (
        <>
          <form
            noValidate
            onSubmit={onSubmit}
            className="flex flex-col gap-4"
            aria-label="Single sign-on"
          >
            <Field>
              <Label htmlFor="sso-email">Work email</Label>
              <Input
                ref={emailRef}
                id="sso-email"
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "sso-email-error" : "sso-email-hint"}
              />
              {error ? (
                <FieldError id="sso-email-error">{error}</FieldError>
              ) : (
                <FieldHint id="sso-email-hint">
                  We use your email domain to find your organization&apos;s sign-in page.
                </FieldHint>
              )}
            </Field>
            <Button type="submit" variant="primary" className="mt-2 w-full">
              Continue with SSO
              <ArrowRight aria-hidden="true" />
            </Button>
          </form>
          <Divider />
          <Button className="w-full" onClick={() => setSubmitted(true)}>
            <Building2 aria-hidden="true" />
            Continue with {PROVIDER}
          </Button>
          <Link
            href="/sign-in"
            className="mt-6 inline-flex items-center gap-1.5 text-dense font-medium text-violet-text hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Sign in with email and password
          </Link>
        </>
      )}
      <NoSignUp />
    </>
  );
}
