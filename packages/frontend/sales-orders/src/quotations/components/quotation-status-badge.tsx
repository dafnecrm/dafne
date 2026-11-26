import { QuotationStatus } from "@dafne/contracts";
import { Badge } from "@dafne/frontend-ui/components/badge";
import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";
import { QUOTATION_STATUS_ICONS, QUOTATION_STATUS_OPTIONS } from "../quotations-table";

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
    const optionLabel = useOptionLabel();
    const Icon = QUOTATION_STATUS_ICONS[status];

    return <Badge variant="outline">
        <Icon />
        {optionLabel(QUOTATION_STATUS_OPTIONS, status)}
    </Badge>
}