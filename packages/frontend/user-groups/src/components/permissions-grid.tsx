"use client";

import { useTranslations } from "next-intl";
import { PERMISSIONS, PERMISSION_KEYS, PERMISSION_SUBJECTS, type Permission } from "@dafne/contracts";
import { Button } from "@dafne/frontend-ui/components/button";
import { Checkbox } from "@dafne/frontend-ui/components/checkbox";

/** Every action, in the catalog's order: the grid's columns. */
const ACTIONS = [...new Set(PERMISSION_SUBJECTS.flatMap((subject) => [...PERMISSIONS[subject]]))];

/**
 * A group's permissions as a grid: one row per subject (customers, orders…),
 * one checkbox per action it has (contracts/permissions.ts), with buttons
 * to select all of them or none.
 */
export function PermissionsGrid({
  value,
  onValueChange,
}: {
  value: Permission[];
  onValueChange: (permissions: Permission[]) => void;
}) {
  const t = useTranslations("userGroups.permissions");
  const toggle = (permission: Permission, on: boolean) =>
    onValueChange(on ? [...value, permission] : value.filter((p) => p !== permission));

  const all = PERMISSION_KEYS.every((permission) => value.includes(permission));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {/* type="button": inside the group's form, they must not submit it. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={all}
          onClick={() => onValueChange([...PERMISSION_KEYS])}
        >
          {t("selectAll")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={value.length === 0}
          onClick={() => onValueChange([])}
        >
          {t("selectNone")}
        </Button>
      </div>
      <div className="overflow-x-auto">
      {/* Fixed layout: the subject column has its own width, the actions share the rest equally. */}
      <table className="w-full min-w-xl table-fixed text-sm">
        <colgroup>
          <col className="w-36" />
          {ACTIONS.map((action) => (
            <col key={action} />
          ))}
        </colgroup>
        <thead>
          <tr className="text-muted-foreground">
            <th className="py-2 pr-4 text-left font-normal" />
            {ACTIONS.map((action) => (
              <th key={action} className="px-2 py-2 text-center font-normal whitespace-nowrap">
                {t(`actions.${action}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_SUBJECTS.map((subject) => (
            <tr key={subject} className="border-t">
              <th scope="row" className="py-2 pr-4 text-left font-medium whitespace-nowrap">
                {t(`subjects.${subject}`)}
              </th>
              {ACTIONS.map((action) => {
                const has = (PERMISSIONS[subject] as readonly string[]).includes(action);
                const permission = `${subject}.${action}` as Permission;
                return (
                  <td key={action} className="px-2 py-2">
                    {has && (
                      <div className="flex justify-center">
                        <Checkbox
                          checked={value.includes(permission)}
                          onCheckedChange={(checked) => toggle(permission, checked)}
                          aria-label={`${t(`subjects.${subject}`)}: ${t(`actions.${action}`)}`}
                        />
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
