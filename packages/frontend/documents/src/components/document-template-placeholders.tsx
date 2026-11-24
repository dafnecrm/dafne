import { RepeatIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DocumentPlaceholder } from "../types.ts";

/** The tags a template of a resource can use, as they are written in Word. */
export function DocumentTemplatePlaceholders({
  placeholders,
}: {
  placeholders: DocumentPlaceholder[] | null;
}) {
  const t = useTranslations("documentTemplates.placeholders");
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 text-sm">
      <div className="font-medium">{t("title")}</div>
      <p className="text-muted-foreground">
        {/* Empty tags of the message (<value></value>…), each replaced by its example. */}
        {t.rich("description", {
          value: () => <code>{"{customer.name}"}</code>,
          loop: () => <code>{"{#items}…{/items}"}</code>,
          filter: () => <code>{"{total | currency}"}</code>,
        })}
      </p>
      {placeholders ? <PlaceholderList placeholders={placeholders} /> : <p className="text-muted-foreground">{t("none")}</p>}
    </div>
  );
}

function PlaceholderList({ placeholders }: { placeholders: DocumentPlaceholder[] }) {
  const t = useTranslations("documentTemplates.placeholders");
  return (
    <ul className="flex flex-col gap-1">
      {placeholders.map((placeholder) =>
        placeholder.loop ? (
          <li key={placeholder.tag} className="flex flex-col gap-1">
            <span className="flex items-center gap-2">
              <code>{`{#${placeholder.tag}}`}</code>
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <RepeatIcon className="size-3" />
                {t("loop")}
              </span>
            </span>
            <div className="border-l pl-4">
              <PlaceholderList placeholders={placeholder.loop} />
            </div>
            <code>{`{/${placeholder.tag}}`}</code>
          </li>
        ) : (
          <li key={placeholder.tag}>
            <code>{`{${placeholder.tag}}`}</code>
          </li>
        ),
      )}
    </ul>
  );
}
