"use client";

import { useTranslations } from "next-intl";
import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { Button } from "@dafne/frontend-ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@dafne/frontend-ui/components/card";
import { FieldGroup } from "@dafne/frontend-ui/components/field";
import { setServerError, useAppForm } from "@/lib/app-form/app-form";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import type { ProductDetail } from "@/lib/products";
import { saveProduct } from "./actions";
import { productFormOpts, productSchema } from "./schema";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";

/** Creates a product, or edits `product`. Saving opens its page. */
export function ProductForm({ product }: { product?: ProductDetail }) {
  const t = useTranslations();
  const form = useAppForm({
    ...productFormOpts(product),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: productSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveProduct(product?.id ?? null, value);
      if (result?.error) setServerError(formApi, result.error);
    },
  });
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);
  const cancelHref = product
    ? `/products/${encodeURIComponent(product.id)}`
    : "/products";

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
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t("products.sections.details")}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <form.AppField name="name">
                  {(field) => (
                    <field.TextField
                      label={t("products.fields.name")}
                      autoComplete="off"
                      autoFocus
                    />
                  )}
                </form.AppField>
                <form.AppField name="price">
                  {(field) => (
                    <field.TextField
                      label={t("products.fields.price")}
                      inputMode="decimal"
                      autoComplete="off"
                      addons={[
                        <InputGroupAddon key="currency" align="inline-start">
                          €
                        </InputGroupAddon>,
                      ]}
                    />
                  )}
                </form.AppField>
                <form.AppField name="description">
                  {(field) => (
                    <field.TextEditorField
                      label={t("products.fields.description")}
                      className="col-span-2"
                    />
                  )}
                </form.AppField>
              </div>
            </CardContent>
          </Card>

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
