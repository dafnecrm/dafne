import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/session";

export default function Home() {
  return (
    <Suspense fallback={<Skeleton className="h-24 w-full rounded-xl" />}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const user = await requireUser();
  const t = await getTranslations("dashboard");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {t("welcome", { name: user.firstname })}
        </CardTitle>
        <CardDescription>
          {t("signedInAs", { email: user.email })}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
