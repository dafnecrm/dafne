"use client";

import { revalidateLogic } from "@tanstack/react-form-nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@dafne/frontend-ui/components/button";
import { DetailSection } from "@dafne/frontend-ui/components/detail";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@dafne/frontend-ui/components/field";
import { PermissionsGrid } from "./permissions-grid.tsx";
import { UserMultiSelect } from "./user-multi-select.tsx";
import { setServerError, useAppForm } from "@dafne/frontend-forms/client";
import { useResetOnLeave } from "@dafne/frontend-forms/client";
import { saveUserGroup } from "../actions.ts";
import { userGroupFormOpts, userGroupSchema } from "../schema.ts";
import type { UserGroupDetail } from "../types.ts";
import { TextIcon } from "lucide-react";
import { InputGroupAddon } from "@dafne/frontend-ui/components/input-group";

/**
 * Creates an user group, or edits `userGroup`. Saving opens the user group's page
 * (`<path>/<id>`, `path` being the app's user groups list).
 */
export function UserGroupForm({
  userGroup,
  path,
}: {
  userGroup?: UserGroupDetail;
  path: string;
}) {
  const t = useTranslations();
  const form = useAppForm({
    ...userGroupFormOpts(userGroup),
    // Validate on submit, then on every change.
    validationLogic: revalidateLogic(),
    validators: { onDynamic: userGroupSchema },
    onSubmit: async ({ value, formApi }) => {
      // Redirects on success, so only an error comes back.
      const result = await saveUserGroup(userGroup?.id ?? null, value, path);
      if (result?.error) {
        setServerError(formApi, result.error);
      }
    },
  });
  // The page stays mounted (hidden) after leaving it: start fresh next time.
  useResetOnLeave(form);
  const cancelHref = userGroup
    ? `${path}/${encodeURIComponent(userGroup.id)}`
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
            title={t("userGroups.sections.details")}
            groupVariant="grid"
          >
            {/* The fields: dafne g/sync add one <form.AppField> per field of the contract's body. */}
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label={t("userGroups.fields.name")}
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
                  label={t("userGroups.fields.description")}
                  className="col-span-full"
                />
              )}
            </form.AppField>
          </DetailSection>

          <DetailSection title={t("userGroups.sections.permissions")}>
            <FieldDescription>{t("userGroups.permissions.hint")}</FieldDescription>
            <form.Field name="permissions">
              {(field) => (
                <PermissionsGrid
                  value={field.state.value}
                  onValueChange={field.handleChange}
                />
              )}
            </form.Field>
          </DetailSection>

          {userGroup?.allUsers ? (
            <DetailSection title={t("userGroups.sections.members")}>
              <FieldDescription>{t("userGroups.allUsers.hint")}</FieldDescription>
            </DetailSection>
          ) : (
            <DetailSection title={t("userGroups.sections.members")}>
              <form.Field name="members">
                {(field) => (
                  <Field data-invalid={!field.state.meta.isValid}>
                    <FieldLabel htmlFor={field.name}>
                      {t("userGroups.fields.memberIds")}
                    </FieldLabel>
                    <UserMultiSelect
                      id={field.name}
                      value={field.state.value}
                      onValueChange={field.handleChange}
                      onBlur={field.handleBlur}
                      aria-invalid={!field.state.meta.isValid}
                    />
                  </Field>
                )}
              </form.Field>
            </DetailSection>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={cancelHref} />}
            >
              {t("common.cancel")}
            </Button>
            <form.SubmitButton
              label={t(userGroup ? "common.saveChanges" : "userGroups.create")}
            />
          </div>
        </FieldGroup>
      </form.AppForm>
    </form>
  );
}
