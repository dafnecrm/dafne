import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dafne/frontend-ui/components/card";
import { SignInForm } from "./sign-in-form";
import { PawPrint } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signIn");
  return { title: t("meta") };
}

export default function SignInPage() {
  const t = useTranslations("auth.signIn");
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 items-center justify-center">
          <PawPrint />
          <span className="font-medium text-2xl bg-linear-to-r from-primary to-[dimgrey] bg-clip-text text-transparent">
            Dafne
          </span>
        </div>
        <CardTitle className="text-xl text-center">{t("title")}</CardTitle>
        <CardDescription className="text-center">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm />
        <div className="flex justify-center text-muted-foreground mt-4">
          <span>
            {t("noAccount")}{" "}
            <Link
              href="/sign-up"
              className="text-foreground underline underline-offset-4"
            >
              {t("signUp")}
            </Link>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
