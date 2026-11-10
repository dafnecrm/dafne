"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@dafne/frontend-ui/components/alert";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@dafne/frontend-ui/components/card";
import { authClient, useAuthErrorMessage } from "@dafne/frontend-auth/client";

/** Where verification links send the user (back to this page). */
export const VERIFY_EMAIL_PATH = "/verify-email";

type ResendState =
  | { status: "idle" | "sending" | "sent" }
  | { status: "error"; message: string };

export function VerifyEmail() {
  const params = useSearchParams();
  const error = params.get("error");
  const email = params.get("email");

  if (error) {
    return <LinkFailed expired={error === "TOKEN_EXPIRED"} />;
  }
  return <CheckInbox email={email} />;
}

function CheckInbox({ email }: { email: string | null }) {
  const [resend, setResend] = useState<ResendState>({ status: "idle" });
  const t = useTranslations("auth.verify");
  const authErrorMessage = useAuthErrorMessage();

  async function resendEmail() {
    if (!email) {
      return;
    }
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
        <CardTitle className="text-xl">{t("checkInbox")}</CardTitle>
        <CardDescription>
          {t.rich("sentTo", {
            email: () =>
              email ? (
                <span className="font-medium text-foreground">{email}</span>
              ) : (
                t("yourEmail")
              ),
          })}
        </CardDescription>
      </CardHeader>
      {email && (
        <CardContent className="flex flex-col gap-3">
          {resend.status === "sent" && (
            <Alert>
              <AlertDescription>{t("resent")}</AlertDescription>
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
            {resend.status === "sending" ? t("sending") : t("resend")}
          </Button>
        </CardContent>
      )}
      <BackToSignIn />
    </Card>
  );
}

function LinkFailed({ expired }: { expired: boolean }) {
  const t = useTranslations("auth.verify");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {expired ? t("expired") : t("broken")}
        </CardTitle>
        <CardDescription>{t("signInForNewLink")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          nativeButton={false}
          render={<Link href="/sign-in" />}
        >
          {t("signIn")}
        </Button>
      </CardContent>
    </Card>
  );
}

function BackToSignIn() {
  const t = useTranslations("auth.verify");
  return (
    <CardFooter className="justify-center text-muted-foreground">
      <Link
        href="/sign-in"
        className="text-foreground underline underline-offset-4"
      >
        {t("backToSignIn")}
      </Link>
    </CardFooter>
  );
}
