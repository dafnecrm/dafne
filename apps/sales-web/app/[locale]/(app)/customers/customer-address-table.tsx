'use client';

import { useOptionLabel } from "@/i18n/options";
import { countryName } from "@/lib/country-name";
import { CUSTOMER_ADDRESS_TYPE_OPTIONS } from "@/lib/customers-table";
import { CustomerAddress, CustomerDetail } from "@dafne/contracts";
import { defineDataTable, TableParams } from "@dafne/frontend-data-table";
import { createDataTableColumnHelper, DataTable } from "@dafne/frontend-data-table/table";
import { useTranslations, useLocale } from "next-intl";
import { useMemo } from "react";

const col = createDataTableColumnHelper<CustomerAddress>();

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
            countryName(address.countryCode, locale, address.country.name),
          { id: "country", header: t("country") },
        ),
      ]),
    [t, optionLabel, locale],
  );
}

export function CustomerAddressTable({ addresses }: { addresses: CustomerDetail["addresses"] }) {
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

  return (
    <DataTable
      columns={columns}
      data={addresses}
      total={addresses?.length ?? 0}
      params={params}
      config={tableConfig}
      manualPagination={false}
      manualSorting={false}
    />
  )
}