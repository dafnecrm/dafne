import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@dafne/frontend-ui/components/card";
import { SignUpForm } from "./sign-up-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signUp");
  return { title: t("meta") };
}

export default function SignUpPage() {
  const t = useTranslations("auth.signUp");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm />
      </CardContent>
      <CardFooter className="justify-center text-muted-foreground">
        <span>
          {t("haveAccount")}{" "}
          <Link
            href="/sign-in"
            className="text-foreground underline underline-offset-4"
          >
            {t("signIn")}
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
