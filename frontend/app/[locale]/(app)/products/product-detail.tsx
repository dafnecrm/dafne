import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  UserPenIcon,
  UserPlusIcon,
  TextIcon,
} from "lucide-react";
import CopyButton from "@/components/copy-button";
import { Detail, DetailSection } from "@/components/detail";
import { LocalDate } from "@/components/local-date";
import type { ProductDetail } from "@/lib/products";
import { TextEditorContent } from "@/components/ui/text-editor";

/** The details of a product: its fields, then who created and updated it. */
export function ProductDetails({ product }: { product: ProductDetail }) {
  return (
    <>
      <DetailSection title="Details">
        <Detail icon={TextIcon} label="Price">
          {product.price}
        </Detail>
        <Detail icon={TextIcon} label="Description">
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
      <DetailSection title="Record">
        <Detail icon={FingerprintIcon} label="Product ID">
          <div className="flex items-center gap-2">
            <code className="truncate font-mono text-xs">{product.id}</code>
            <CopyButton variant="ghost" value={product.id} />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label="Created">
          <LocalDate value={product.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label="Created by">
          {product.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label="Updated">
          <LocalDate value={product.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label="Updated by">
          {product.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
