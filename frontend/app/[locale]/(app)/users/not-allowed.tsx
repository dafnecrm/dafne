import { useTranslations } from "next-intl";
import { ShieldAlertIcon } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/** Shown on the users pages to non-admins. */
export function NotAllowed({ children }: { children?: React.ReactNode }) {
  const t = useTranslations("users.notAllowed");
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldAlertIcon />
        </EmptyMedia>
        <EmptyTitle>{t("title")}</EmptyTitle>
        <EmptyDescription>{children ?? t("list")}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
