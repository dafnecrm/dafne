import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { requireUser } from "@/lib/session";
import { PageContent, PageContentDescription, PageContentHeader, PageContentTitle } from "@dafne/frontend-ui/components/page-content";

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
    <PageContent>
      <PageContentHeader>
        <PageContentTitle>
          {t("welcome", { name: user.firstname })}
        </PageContentTitle>
        <PageContentDescription>
          {t("signedInAs", { email: user.email })}
        </PageContentDescription>
      </PageContentHeader>
    </PageContent>
  );
}
