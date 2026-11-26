import { ActivityStatus } from "@dafne/contracts";
import { Badge } from "@dafne/frontend-ui/components/badge";
import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";
import { ACTIVITY_STATUS_ICONS } from "./activity-status-icons";
import { ACTIVITY_STATUS_OPTIONS } from "../activity-status-options";

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  const optionLabel = useOptionLabel();
  const Icon = ACTIVITY_STATUS_ICONS[status];

  return <Badge variant="outline">
    <Icon />
    {optionLabel(ACTIVITY_STATUS_OPTIONS, status)}
  </Badge>
}