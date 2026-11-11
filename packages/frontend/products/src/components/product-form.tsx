"use client";

import { useTranslations } from "next-intl";
import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { Button } from "@dafne/frontend-ui/components/button";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError, useAppForm } from "@dafne/frontend-forms/client";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import { saveProduct } from "../actions.ts";
import { productFormOpts, productSchema } from "../schema.ts";
import type { ProductDetail } from "../types.ts";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";
import { EuroIcon, TextIcon } from "lucide-react";
import { DetailSection } from "@dafne/frontend-ui/components/detail";

/**
 * Creates a product, or edits `product`. Saving opens the product's page
 * (`<path>/<id>`, `path` being the app's products list).
 */
export function ProductForm({
  product,
  path,
}: {
  product?: ProductDetail;
  path: string;
}) {
  const t = useTranslations();
  const form = useAppForm({
    ...productFormOpts(product),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: productSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveProduct(product?.id ?? null, value, path);
      if (result?.error) {
        setServerError(formApi, result.error);
      }
    },
  });
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);
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

            <form.AppField name="description">
              {(field) => (
                <field.TextEditorField
                  label={t("products.fields.description")}
                  className="col-span-full"
                />
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
              label={t(product ? "common.saveChanges" : "products.create")}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
