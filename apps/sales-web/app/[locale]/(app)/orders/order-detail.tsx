import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  UserPenIcon,
  UserPlusIcon,
  TextIcon,
  LinkIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import CopyButton from "@/components/copy-button";
import { Detail, DetailSection } from "@/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import type { OrderDetail } from "@/lib/orders";
import { TextEditorContent } from "@dafne/frontend-ui/components/text-editor";

/** The details of an order: its fields, then who created and updated it. */
export function OrderDetails({ order }: { order: OrderDetail }) {
  const t = useTranslations();
  return (
    <>
      <DetailSection title={t("orders.sections.details")}>
        <Detail icon={TextIcon} label={t("orders.fields.notes")} wide>
          {order.notes ? (
            <TextEditorContent html={order.notes} className="font-normal" />
          ) : (
            "—"
          )}
        </Detail>
        <Detail icon={LinkIcon} label={t("orders.fields.customerId")}>
          <code className="font-mono text-xs">{order.customerId}</code>
        </Detail>
      </DetailSection>
      <DetailSection title={t("common.record.title")}>
        <Detail icon={FingerprintIcon} label={t("orders.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-mono text-xs">{order.id}</code>
            <CopyButton variant="ghost" value={order.id} />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label={t("common.record.created")}>
          <LocalDate value={order.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label={t("common.record.createdBy")}>
          {order.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label={t("common.record.updated")}>
          <LocalDate value={order.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label={t("common.record.updatedBy")}>
          {order.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
