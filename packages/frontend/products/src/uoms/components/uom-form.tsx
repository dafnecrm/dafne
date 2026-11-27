"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@dafne/frontend-ui/components/button";
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError, useAppForm } from "@dafne/frontend-forms/client";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import { saveUom } from "../actions.ts";
import { uomFormOpts, uomSchema, KIND_OPTIONS } from "../schema.ts";
import type { UomDetail } from "../types.ts";
import { HashIcon, TextIcon, TagIcon } from "lucide-react";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";
import { useOptionLabels } from "@dafne/frontend-ui/hooks/use-option-labels";

/**
 * Creates a unit of measure, or edits `uom` (its conversions are edited in
 * /uom-conversions). Saving opens the unit's page (`<path>/<id>`, `path`
 * being the app's list).
 */
export function UomForm({ uom, path }: { uom?: UomDetail; path: string }) {
  const t = useTranslations();
  const kindOptions = useOptionLabels(KIND_OPTIONS);
  const form = useAppForm({
    ...uomFormOpts(uom),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: uomSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveUom(uom?.id ?? null, value, path);
      if (result?.error) {
        setServerError(formApi, result);
      }
    },
  });
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);
  const cancelHref = uom ? `${path}/${encodeURIComponent(uom.id)}` : path;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.AppForm>
        <FieldGroup>
          <form.FormErrors />

          <DetailSection title={t("uoms.sections.details")} groupVariant="grid">
            {/* The fields: dafne g/sync add one <form.AppField> per field of the contract's body. */}
            <form.AppField name="id">
              {(field) => (
                <field.TextField
                  label={t("uoms.fields.id")}
                  placeholder={t("uoms.fields.idHint")}
                  autoComplete="off"
                  // The symbol is the unit's key: PUT keeps the path's.
                  disabled={!!uom}
                  maxLength={10}
                >
                  <InputGroupAddon>
                    <HashIcon />
                  </InputGroupAddon>
                </field.TextField>
              )}
            </form.AppField>
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label={t("uoms.fields.name")}
                  autoComplete="off"
                >
                  <InputGroupAddon>
                    <TextIcon />
                  </InputGroupAddon>
                </field.TextField>
              )}
            </form.AppField>
            <form.AppField name="description">
              {(field) => (
                <field.TextareaField
                  label={t("uoms.fields.description")}
                  className="col-span-full"
                />
              )}
            </form.AppField>
            <form.AppField name="kind">
              {(field) => (
                <field.SelectField
                  label={t("uoms.fields.kind")}
                  options={kindOptions}
                >
                  <InputGroupAddon>
                    <TagIcon />
                  </InputGroupAddon>
                </field.SelectField>
              )}
            </form.AppField>
          </DetailSection>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={cancelHref} />}
            >
              {t("common.cancel")}
            </Button>
            <form.SubmitButton
              label={t(uom ? "common.saveChanges" : "uoms.create")}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
