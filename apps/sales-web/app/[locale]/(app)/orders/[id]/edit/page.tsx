import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import {
  PageContent,
  PageContentBody,
  PageContentDescription,
  PageContentHeader,
  PageContentTitle,
} from "@/components/page-content";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { OrderForm } from "../../order-form";
import { loadOrder } from "../load-order";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("orders.editMeta") };
}

export default function EditOrderPage({
  params,
}: PageProps<"/[locale]/orders/[id]/edit">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <EditOrder params={params} />
    </Suspense>
  );
}

async function EditOrder({
  params,
}: Pick<PageProps<"/[locale]/orders/[id]/edit">, "params">) {
  const order = await loadOrder((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`/orders/${encodeURIComponent(order.id)}`}
        label={order.name}
      />
      <PageContentHeader>
        <PageContentTitle>
          {t("common.editTitle", { name: order.name })}
        </PageContentTitle>
        <PageContentDescription>
          {t("orders.editDescription")}
        </PageContentDescription>
      </PageContentHeader>
      <PageContentBody>
        <OrderForm order={order} />
      </PageContentBody>
    </PageContent>
  );
}
