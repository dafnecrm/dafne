import type { SalesOrderStatus } from "@dafne/contracts";
import { BanIcon, CircleCheckIcon, CircleIcon, CircleOffIcon, LoaderCircleIcon, type LucideIcon } from "lucide-react";

/**
 * Icon of each status, shown next to its label. No "use client" here, so server
 * components (the detail) get the icons themselves.
 */
export const SALES_ORDER_STATUS_ICONS: Record<SalesOrderStatus, LucideIcon> = {
  draft: CircleIcon,
  open: LoaderCircleIcon,
  completed: CircleCheckIcon,
  cancelled: CircleOffIcon,
  rejected: BanIcon,
};
