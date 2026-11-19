import {
  CalendarPlusIcon,
  FingerprintIcon,
  HistoryIcon,
  UserPenIcon,
  UserPlusIcon,
  TextIcon,
  TagIcon,
  ArrowRightLeftIcon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { Can } from "@dafne/frontend-permissions";
import { Button } from "@dafne/frontend-ui/components/button";
import { useTranslations } from "next-intl";
import CopyButton from "@dafne/frontend-ui/components/copy-button";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import type { UomDetail } from "../types.ts";
import { UOM_KIND_OPTIONS } from "../uoms-table.ts";
import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";

/**
 * The details of a unit: its fields, its conversions (pages under
 * `conversionsPath`), then who created and updated it.
 */
export function UomDetails({
  uom,
  conversionsPath = "/uom-conversions",
}: {
  uom: UomDetail;
  conversionsPath?: string;
}) {
  const t = useTranslations();
  const optionLabel = useOptionLabel();
  return (
    <>
      <DetailSection title={t("uoms.sections.details")} groupVariant="grid">
        <Detail icon={TextIcon} label={t("uoms.fields.name")}>
          {uom.name}
        </Detail>
        <Detail icon={TextIcon} label={t("uoms.fields.description")}>
          {uom.description ?? "—"}
        </Detail>
        <Detail icon={TagIcon} label={t("uoms.fields.kind")}>
          {optionLabel(UOM_KIND_OPTIONS, uom.kind)}
        </Detail>
      </DetailSection>
      <DetailSection
        title={t("uoms.sections.conversions")}
        actions={
          <Can I="create" a="UomConversion">
            <Button
              variant="outline"
              size="xs"
              nativeButton={false}
              render={
                <Link
                  href={`${conversionsPath}/new?fromUomId=${encodeURIComponent(uom.id)}`}
                />
              }
            >
              <PlusIcon />
              {t("uoms.conversions.add")}
            </Button>
          </Can>
        }
      >
        {uom.conversions.length === 0 && uom.conversionsFrom.length === 0 && (
          <p className="text-muted-foreground text-sm">
            {t("uoms.conversions.none")}
          </p>
        )}
        {[
          ...uom.conversions.map((conversion) => ({
            id: conversion.id,
            other: conversion.to,
            text: t("uoms.conversions.equals", {
              to: conversion.toUomId,
              factor: conversion.factor,
              from: uom.id,
            }),
          })),
          ...uom.conversionsFrom.map((conversion) => ({
            id: conversion.id,
            other: conversion.from,
            text: t("uoms.conversions.equals", {
              to: uom.id,
              factor: conversion.factor,
              from: conversion.fromUomId,
            }),
          })),
        ].map((conversion) => (
          <Detail
            key={conversion.id}
            icon={ArrowRightLeftIcon}
            label={conversion.other.name}
          >
            <Link
              href={`${conversionsPath}/${conversion.id}`}
              className="underline-offset-4 hover:underline"
            >
              {conversion.text}
            </Link>
          </Detail>
        ))}
      </DetailSection>
      <DetailSection title={t("common.record.title")} defaultOpen={false}>
        <Detail icon={FingerprintIcon} label={t("uoms.fields.id")}>
          <div className="flex items-center gap-2">
            <code className="truncate font-sans text-xs">{uom.id}</code>
            <CopyButton variant="ghost" size="xs" value={String(uom.id)} />
          </div>
        </Detail>
        <Detail icon={CalendarPlusIcon} label={t("common.record.created")}>
          <LocalDate value={uom.createdAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPlusIcon} label={t("common.record.createdBy")}>
          {uom.createdBy?.name ?? "—"}
        </Detail>
        <Detail icon={HistoryIcon} label={t("common.record.updated")}>
          <LocalDate value={uom.updatedAt} format="dateTime" />
        </Detail>
        <Detail icon={UserPenIcon} label={t("common.record.updatedBy")}>
          {uom.updatedBy?.name ?? "—"}
        </Detail>
      </DetailSection>
    </>
  );
}
