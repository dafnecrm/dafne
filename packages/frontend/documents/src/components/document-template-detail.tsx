import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  UserPenIcon,
  UserPlusIcon,
  TextIcon,
  ToggleLeftIcon,
  HashIcon,
  LanguagesIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import CopyButton from "@dafne/frontend-ui/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import type { DocumentPlaceholder, DocumentTemplateDetail } from "../types.ts";
import { DocumentTemplateFile } from "./document-template-file.tsx";
import { DocumentTemplatePlaceholders } from "./document-template-placeholders.tsx";
import { useResourceLabel } from "./use-resource-label.ts";

/**
 * The details of a document template: its fields, its Word file, the tags
 * it can use (`placeholders`, of its resource), then who created and
 * updated it.
 */
export function DocumentTemplateDetails({
  documentTemplate,
  placeholders,
}: {
  documentTemplate: DocumentTemplateDetail;
  placeholders: DocumentPlaceholder[] | null;
}) {
  const t = useTranslations();
  const resourceLabel = useResourceLabel();
  return (
    <>
      <DetailSection
        title={t("documentTemplates.sections.details")}
        groupVariant="grid"
      >
        <Detail icon={TextIcon} label={t("documentTemplates.fields.name")}>
          {documentTemplate.name}
        </Detail>
        <Detail icon={TextIcon} label={t("documentTemplates.fields.resource")}>
          {resourceLabel(documentTemplate.resource)}
        </Detail>
        <Detail icon={LanguagesIcon} label={t("documentTemplates.fields.language")}>
          {t(`documentTemplates.languages.${documentTemplate.language}`)}
        </Detail>
        <Detail
          icon={ToggleLeftIcon}
          label={t("documentTemplates.fields.isDefault")}
        >
          {t(documentTemplate.isDefault ? "common.yes" : "common.no")}
        </Detail>
        <Detail icon={HashIcon} label={t("documentTemplates.fields.size")}>
          {documentTemplate.size === null ? "—" : `${Math.max(1, Math.round(documentTemplate.size / 1024))} KB`}
        </Detail>
      </DetailSection>
      <DetailSection title={t("documentTemplates.file.title")}>
        <DocumentTemplateFile documentTemplate={documentTemplate} />
      </DetailSection>
      <DocumentTemplatePlaceholders placeholders={placeholders} />
      <DetailSection title={t("common.record.title")} defaultOpen={false}>
        <Detail icon={FingerprintIcon} label={t("documentTemplates.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-sans text-xs">
              {documentTemplate.id}
            </code>
            <CopyButton
              variant="ghost"
              size="xs"
              value={String(documentTemplate.id)}
            />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label={t("common.record.created")}>
          <LocalDate value={documentTemplate.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label={t("common.record.createdBy")}>
          {documentTemplate.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label={t("common.record.updated")}>
          <LocalDate value={documentTemplate.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label={t("common.record.updatedBy")}>
          {documentTemplate.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
