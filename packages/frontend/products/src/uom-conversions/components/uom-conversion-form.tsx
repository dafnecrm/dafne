"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@dafne/frontend-ui/components/button";
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError, useAppForm } from "@dafne/frontend-forms/client";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import { saveUomConversion } from "../actions.ts";
import { uomConversionFormOpts, uomConversionSchema } from "../schema.ts";
import type { UomConversionDetail } from "../types.ts";
import type { UomOption } from "../../uoms/types.ts";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";
import { RulerIcon } from "lucide-react";

/**
 * Creates a conversion (from `fromUomId` when given), or edits
 * `uomConversion`; `units` are every unit, for the pickers. Saving opens the
 * conversion's page (`<path>/<id>`, `path` being the app's list).
 */
export function UomConversionForm({
  uomConversion,
  units,
  fromUomId,
  path,
}: {
  uomConversion?: UomConversionDetail;
  units: UomOption[];
  fromUomId?: string | null;
  path: string;
}) {
  const t = useTranslations();
  const option = (unit: UomOption) => ({
    value: unit.id,
    label: `${unit.id} · ${unit.name}`,
  });
  const form = useAppForm({
    ...uomConversionFormOpts(uomConversion, { fromUomId }),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: uomConversionSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveUomConversion(
        uomConversion?.id ?? null,
        value,
        path,
      );
      if (result?.error) {
        setServerError(formApi, result);
      }
    },
  });
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);
  const cancelHref = uomConversion
    ? `${path}/${encodeURIComponent(uomConversion.id)}`
    : path;

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

          <DetailSection
            title={t("uomConversions.sections.details")}
            groupVariant="grid"
          >
            {/* The fields: dafne g/sync add one <form.AppField> per field of the contract's body. */}
            <form.AppField name="fromUomId">
              {(field) => (
                <field.SelectField
                  label={t("uomConversions.fields.fromUomId")}
                  options={units.map(option)}
                >
                  <InputGroupAddon>
                    <RulerIcon />
                  </InputGroupAddon>
                </field.SelectField>
              )}
            </form.AppField>
            <form.Subscribe selector={(state) => state.values.fromUomId}>
              {(from) => {
                const kind = units.find((unit) => unit.id === from)?.kind;
                return (
                  <form.AppField name="toUomId">
                    {(field) => (
                      <field.SelectField
                        label={t("uomConversions.fields.toUomId")}
                        // Another unit of the same kind.
                        options={units
                          .filter((unit) => unit.id !== from && (!kind || unit.kind === kind))
                          .map(option)}
                      >
                        <InputGroupAddon>
                          <RulerIcon />
                        </InputGroupAddon>
                      </field.SelectField>
                    )}
                  </form.AppField>
                );
              }}
            </form.Subscribe>
            <form.AppField name="factor">
              {(field) => (
                <field.NumberField
                  label={t("uomConversions.fields.factor")}
                  min={0}
                  step="any"
                />
              )}
            </form.AppField>
            <form.Subscribe
              selector={(state) =>
                [state.values.fromUomId, state.values.toUomId, state.values.factor] as const
              }
            >
              {([from, to, factor]) =>
                from && to && factor != null ? (
                  <p className="text-muted-foreground col-span-full text-sm">
                    {t("uomConversions.fields.equals", { from, to, factor })}
                  </p>
                ) : null
              }
            </form.Subscribe>
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
              label={t(
                uomConversion ? "common.saveChanges" : "uomConversions.create",
              )}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
