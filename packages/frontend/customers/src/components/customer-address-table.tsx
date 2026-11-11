'use client';

import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";
import { countryName } from "@dafne/frontend-ui/lib/country-name";
import { CUSTOMER_ADDRESS_TYPE_OPTIONS } from "../customers-table.ts";
import { CustomerAddressType } from "@dafne/contracts";
import { defineDataTable, TableParams } from "@dafne/frontend-data-table";
import { createDataTableColumnHelper, DataTable } from "@dafne/frontend-data-table/table";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@dafne/frontend-ui/components/empty";
import { MapPinIcon } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { ReactNode, useMemo } from "react";

export interface CustomerAddressRow {
  type: CustomerAddressType;
  street: string;
  postalCode: string | null;
  city: string;
  countryCode: string;
}

const col = createDataTableColumnHelper<CustomerAddressRow>();

function useCustomerAddressColumns() {
  const t = useTranslations("customers.addresses.fields")
  const locale = useLocale()
  const optionLabel = useOptionLabel()
  return useMemo(
    () =>
      col.columns([
        col.accessor("type", {
          header: t("type"),
          cell: ({ row }) => (
            optionLabel(CUSTOMER_ADDRESS_TYPE_OPTIONS, row.original.type)
          ),
        }),
        col.accessor("street", {
          header: t("street"),
          cell: ({ row }) => (row.original.street),
        }),
        col.accessor("postalCode", {
          header: t("postalCode"),
          cell: ({ row }) => (row.original.postalCode),
        }),
        col.accessor("city", {
          header: t("city"),
          cell: ({ row }) => (row.original.city),
        }),
        // Sort by the name shown (in the user's language), not the
        // `country` object.
        col.accessor(
          (address) =>
            countryName(address.countryCode, locale, address.countryCode),
          { id: "country", header: t("country") },
        ),
      ]),
    [t, optionLabel, locale],
  );
}

/**
 * A customer's addresses. With none, links to the edit page
 * (`<path>/<id>/edit`, `path` being the app's customers list).
 */
export function CustomerAddressTable({
  addresses,
  rowActions,
  emptyContent
}: {
  addresses: CustomerAddressRow[],
  rowActions?: (row: CustomerAddressRow, index: number) => ReactNode;
  emptyContent?: ReactNode;
}) {
  const t = useTranslations();
  const columns = useCustomerAddressColumns()
  const params: TableParams = {
    filters: {},
    page: 1,
    pageSize: 5,
    offset: 0,
    sort: { id: "type", desc: false },
  }

  const tableConfig = defineDataTable({
    defaultSort: { id: "type", desc: false },
    sortable: ["type", "street", "city", "postalCode", "country"],
    pageSizes: [5]
  })

  return (<DataTable
    columns={columns}
    data={addresses}
    total={addresses?.length ?? 0}
    params={params}
    config={tableConfig}
    manualPagination={false}
    manualSorting={false}
    rowActions={rowActions}
    empty={<Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MapPinIcon />
        </EmptyMedia>
        <EmptyTitle>
          {t("customers.addresses.none")}{" "}
        </EmptyTitle>
        <EmptyDescription>
          {t("customers.addresses.noneDetail")}{" "}
        </EmptyDescription>
      </EmptyHeader>
      {emptyContent && <EmptyContent>
        {emptyContent}
      </EmptyContent>}
    </Empty>}
  />)
}