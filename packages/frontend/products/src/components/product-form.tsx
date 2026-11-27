"use client";

import { useTranslations } from "next-intl";
import { revalidateLogic, useSelector } from "@tanstack/react-form-nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@dafne/frontend-ui/components/button";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError, useAppForm } from "@dafne/frontend-forms/client";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import { saveProduct } from "../actions.ts";
import { productFormOpts, productSchema } from "../schema.ts";
import type { ProductDetail } from "../types.ts";
import type { UomOption } from "../uoms/types.ts";
import { getConvertibleUoms } from "../uom-conversions/actions.ts";
import type { ConvertibleUom } from "../uom-conversions/types.ts";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";
import { EuroIcon, PlusIcon, RulerIcon, TextIcon, Trash2Icon } from "lucide-react";
import { DetailSection } from "@dafne/frontend-ui/components/detail";

/**
 * Creates a product, or edits `product`, with its unit of measure (`units`:
 * every unit, for the picker) and the units it is also sold in, which its
 * unit converts to. Saving opens the product's page (`<path>/<id>`, `path`
 * being the app's products list).
 */
export function ProductForm({
  product,
  units,
  path,
}: {
  product?: ProductDetail;
  units: UomOption[];
  path: string;
}) {
  const t = useTranslations();
  const unitOptions = units.map((unit) => ({
    value: unit.id,
    label: `${unit.id} · ${unit.name}`,
  }));
  const form = useAppForm({
    ...productFormOpts(product),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: productSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveProduct(product?.id ?? null, value, path);
      if (result?.error) {
        setServerError(formApi, result);
      }
    },
  });
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);

  // The units the base unit converts to, as last loaded for `base`.
  const base = useSelector(form.store, (state) => state.values.uomId);
  const [loaded, setLoaded] = useState<{ base: string; units: ConvertibleUom[] } | null>(null);
  useEffect(() => {
    if (!base) {
      return;
    }
    let current = true;
    getConvertibleUoms(base).then(
      (units) => current && setLoaded({ base, units }),
      () => current && setLoaded({ base, units: [] }),
    );
    return () => {
      current = false;
    };
  }, [base]);
  const convertible = loaded && loaded.base === base ? loaded.units : [];
  const convertibleOptions = convertible.map((unit) => ({
    value: unit.uomId,
    label: `${unit.uomId} · ${unit.name}`,
  }));
  const cancelHref = product
    ? `${path}/${encodeURIComponent(product.id)}`
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

          <DetailSection title={t("products.sections.details")} groupVariant="grid">
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label={t("products.fields.name")}
                  autoComplete="off"
                  autoFocus
                >
                  <InputGroupAddon>
                    <TextIcon />
                  </InputGroupAddon>
                </field.TextField>
              )}
            </form.AppField>
            <form.AppField name="price">
              {(field) => (
                <field.TextField
                  label={t("products.fields.price")}
                  inputMode="decimal"
                  autoComplete="off"
                >
                  <InputGroupAddon>
                    <EuroIcon />
                  </InputGroupAddon>
                </field.TextField>
              )}
            </form.AppField>
            <form.AppField name="uomId">
              {(field) => (
                <field.SelectField
                  label={t("products.fields.uomId")}
                  options={unitOptions}
                >
                  <InputGroupAddon>
                    <RulerIcon />
                  </InputGroupAddon>
                </field.SelectField>
              )}
            </form.AppField>

            <form.AppField name="description">
              {(field) => (
                <field.TextEditorField
                  label={t("products.fields.description")}
                  className="col-span-full"
                />
              )}
            </form.AppField>
          </DetailSection>

          {/* Not mode="array" (see the sales order's items): the rows follow every value. */}
          <form.AppField name="units">
            {(productUnits) => (
              <DetailSection
                title={t("products.sections.units")}
                groupClassName="flex flex-col gap-3"
                actions={
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={!base}
                    onClick={() => productUnits.pushValue({ uomId: "" })}
                  >
                    <PlusIcon />
                    {t("products.units.add")}
                  </Button>
                }
              >
                <p className="text-muted-foreground text-sm">
                  {t("products.units.hint")}
                </p>
                {productUnits.state.value.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    {t("products.units.none")}
                  </p>
                )}
                {productUnits.state.value.map((unit, i) => {
                  const factor = convertible.find((option) => option.uomId === unit.uomId)?.factor;
                  return (
                    <div key={i} className="grid grid-cols-[1fr_auto] items-end gap-2">
                      <form.AppField name={`units[${i}].uomId`}>
                        {(field) => (
                          <field.SelectField
                            label={t("products.units.uomId")}
                            options={convertibleOptions}
                          />
                        )}
                      </form.AppField>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("products.units.remove")}
                        onClick={() => productUnits.removeValue(i)}
                      >
                        <Trash2Icon />
                      </Button>
                      {unit.uomId && factor !== undefined && (
                        <p className="text-muted-foreground col-span-full -mt-1 text-xs">
                          {t("products.units.equals", { unit: unit.uomId, factor, base })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </DetailSection>
            )}
          </form.AppField>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={cancelHref} />}
            >
              {t("common.cancel")}
            </Button>
            <form.SubmitButton
              label={t(product ? "common.saveChanges" : "products.create")}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
