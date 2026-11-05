import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BreadcrumbLabel } from "@/components/page-breadcrumb";
import {
  PageContent,
  PageContentAction,
  PageContentBody,
  PageContentHeader,
  PageContentTitle,
} from "@dafne/frontend-ui/components/page-content";
import { Button } from "@dafne/frontend-ui/components/button";
import { Skeleton } from "@dafne/frontend-ui/components/skeleton";
import { OrderDetailActions } from "../order-detail-actions";
import { OrderDetails } from "../order-detail";
import { loadOrder } from "./load-order";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t("orders.singular") };
}

export default function OrderPage({
  params,
}: PageProps<"/[locale]/orders/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <OrderProfile params={params} />
    </Suspense>
  );
}

/** Loads the order: its name and actions, then its details. */
async function OrderProfile({
  params,
}: Pick<PageProps<"/[locale]/orders/[id]">, "params">) {
  const order = await loadOrder((await params).id);
  const t = await getTranslations();

  return (
    <PageContent>
      <BreadcrumbLabel
        href={`/orders/${encodeURIComponent(order.id)}`}
        label={`${t("orders.singular")} ${order.id}`}
      />
      <PageContentHeader>
        <PageContentTitle>{`${t("orders.singular")} ${order.id}`}</PageContentTitle>
        <PageContentAction className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/orders" />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {t("orders.all")}
          </Button>
          <OrderDetailActions order={order} />
        </PageContentAction>
      </PageContentHeader>
      <PageContentBody>
        <OrderDetails order={order} />
      </PageContentBody>
    </PageContent>
  );
}
