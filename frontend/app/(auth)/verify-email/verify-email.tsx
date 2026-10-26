"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient, authErrorMessage } from "@/lib/auth-client";

/** Where verification links send the user (back to this page). */
export const VERIFY_EMAIL_PATH = "/verify-email";

type ResendState =
  | { status: "idle" | "sending" | "sent" }
  | { status: "error"; message: string };

export function VerifyEmail() {
  const params = useSearchParams();
  const error = params.get("error");
  const email = params.get("email");

  if (error) return <LinkFailed expired={error === "TOKEN_EXPIRED"} />;
  return <CheckInbox email={email} />;
}

function CheckInbox({ email }: { email: string | null }) {
  const [resend, setResend] = useState<ResendState>({ status: "idle" });

  async function resendEmail() {
    if (!email) return;
    setResend({ status: "sending" });
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: VERIFY_EMAIL_PATH,
    });
    setResend(
      error
        ? { status: "error", message: authErrorMessage(error) }
        : { status: "sent" },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Check your inbox</CardTitle>
        <CardDescription>
          We sent a verification link to{" "}
          {email ? (
            <span className="font-medium text-foreground">{email}</span>
          ) : (
            "your email address"
          )}
          . Click it to activate your account and sign in.
        </CardDescription>
      </CardHeader>
      {email && (
        <CardContent className="flex flex-col gap-3">
          {resend.status === "sent" && (
            <Alert>
              <AlertDescription>A new link is on its way.</AlertDescription>
            </Alert>
          )}
          {resend.status === "error" && (
            <Alert variant="destructive">
              <AlertDescription>{resend.message}</AlertDescription>
            </Alert>
          )}
          <Button
            variant="outline"
            className="w-full"
            disabled={resend.status === "sending"}
            onClick={resendEmail}
          >
            {resend.status === "sending" ? "Sending…" : "Resend email"}
          </Button>
        </CardContent>
      )}
      <BackToSignIn />
    </Card>
  );
}

function LinkFailed({ expired }: { expired: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {expired ? "This link has expired" : "This link doesn't work"}
        </CardTitle>
        <CardDescription>
          Sign in with your email and password and we&apos;ll send you a new
          verification link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          nativeButton={false}
          render={<Link href="/sign-in" />}
        >
          Sign in
        </Button>
      </CardContent>
    </Card>
  );
}

function BackToSignIn() {
  return (
    <CardFooter className="justify-center text-muted-foreground">
      <Link
        href="/sign-in"
        className="text-foreground underline underline-offset-4"
      >
        Back to sign in
      </Link>
    </CardFooter>
  );
}
