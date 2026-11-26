import { SalesOrderStatus } from "@dafne/contracts"
import { SALES_ORDER_STATUS_OPTIONS } from "../sales-orders-table"
import { SALES_ORDER_STATUS_ICONS } from "./sales-order-status-icons"
import { Badge } from "@dafne/frontend-ui/components/badge"
import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels"

export function SalesOrderStatusBadge({ status }: { status: SalesOrderStatus }) {
    const optionLabel = useOptionLabel();
    const Icon = SALES_ORDER_STATUS_ICONS[status];

    return <Badge variant="outline">
        <Icon />
        {optionLabel(SALES_ORDER_STATUS_OPTIONS, status)}
    </Badge>
}