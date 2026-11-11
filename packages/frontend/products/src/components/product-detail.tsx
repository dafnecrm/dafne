import { useTranslations } from "next-intl";
import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  UserPenIcon,
  UserPlusIcon,
  TextIcon, BanknoteIcon
} from "lucide-react";
import CopyButton from "@dafne/frontend-ui/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import { Currency } from "@dafne/frontend-ui/components/currency";
import type { ProductDetail } from "../types.ts";
import { TextEditorContent } from "@dafne/frontend-ui/components/text-editor";

/** The details of a product: its fields, then who created and updated it. */
export function ProductDetails({ product }: { product: ProductDetail }) {
  const t = useTranslations();
  return (
    <>
      <DetailSection title={t("products.sections.details")} groupVariant="grid">
        <Detail icon={TextIcon} label={t("products.fields.name")}>
          {product.name}
        </Detail>
        <Detail icon={BanknoteIcon} label={t("products.fields.price")}>
          <Currency value={product.price} />
        </Detail>
        <Detail icon={TextIcon} label={t("products.fields.description")} wide>
          {product.description ? (
            <TextEditorContent
              html={product.description}
              className="font-normal"
            />
          ) : (
            "—"
          )}
        </Detail>
      </DetailSection>
      <DetailSection title={t("common.record.title")} defaultOpen={false}>
        <Detail icon={FingerprintIcon} label={t("products.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-sans text-xs">{product.id}</code>
            <CopyButton variant="ghost" size="xs" value={String(product.id)} />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label={t("common.record.created")}>
          <LocalDate value={product.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label={t("common.record.createdBy")}>
          {product.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label={t("common.record.updated")}>
          <LocalDate value={product.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label={t("common.record.updatedBy")}>
          {product.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
