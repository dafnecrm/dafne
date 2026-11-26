import { ArrowLeftIcon } from "lucide-react";
import { cn } from "cn";
import type * as React from "react";
import { Button } from "@dafne/frontend-ui/components/button";

/*
 * Main content of a page: laid out like Card (header with title,
 * description and action, then content and footer) but with no border,
 * background or padding, so it sits directly on the page.
 *
 *   <PageContent>
 *     <PageContentHeader>
 *       <PageContentTitle>Users</PageContentTitle>
 *       <PageContentDescription>Everyone with an account.</PageContentDescription>
 *       <PageContentAction><Button>Invite</Button></PageContentAction>
 *     </PageContentHeader>
 *     <PageContentBody>…</PageContentBody>
 *   </PageContent>
 *
 * A detail page goes back to its list with an icon before the title, its
 * text for screen readers and the tooltip:
 *
 *   <PageContentTitle
 *     back={<PageContentBack label="All customers" render={<Link href="/customers" />} />}
 *   >
 */

function PageContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-content"
      className={cn("flex flex-col gap-4 text-sm", className)}
      {...props}
    />
  );
}

function PageContentHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-content-header"
      className={cn(
        "grid auto-rows-min items-start gap-1 has-data-[slot=page-content-action]:grid-cols-[minmax(0,1fr)_auto] has-data-[slot=page-content-description]:grid-rows-[auto_auto]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The page's title; with `back` (a `PageContentBack`), that link goes
 * before it, and on small screens a title too long for the row is cut
 * with an ellipsis.
 */
function PageContentTitle({
  className,
  back,
  ...props
}: React.ComponentProps<"h1"> & { back?: React.ReactNode }) {
  const title = (
    <h1
      data-slot="page-content-title"
      className={cn(
        "font-heading text-xl leading-snug font-medium",
        back && "min-w-0 max-sm:truncate",
        className,
      )}
      {...props}
    />
  );
  if (!back) {
    return title;
  }
  return (
    // The title's font and line height, so 1lh is one line of it: the
    // link sits on the first line, also when the title wraps.
    <div className="flex min-w-0 items-start gap-1 font-heading text-xl leading-snug">
      <span className="flex h-[1lh] shrink-0 items-center">{back}</span>
      {title}
    </div>
  );
}

/**
 * Icon-only link back (to the list, usually), for `PageContentTitle`'s
 * `back`: `render` is the link (`<Link href="…" />`), `label` its text.
 */
function PageContentBack({
  label,
  render,
  className,
}: {
  label: string;
  render: React.ReactElement;
  className?: string;
}) {
  return (
    <Button
      data-slot="page-content-back"
      variant="ghost"
      size="icon-sm"
      nativeButton={false}
      render={render}
      aria-label={label}
      title={label}
      className={cn("-ml-1.5", className)}
    >
      <ArrowLeftIcon />
    </Button>
  );
}

function PageContentDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="page-content-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function PageContentAction({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-content-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function PageContentBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="page-content-body" className={cn('flex flex-col gap-6', className)} {...props} />;
}

function PageContentFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-content-footer"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  );
}

export {
  PageContent,
  PageContentHeader,
  PageContentTitle,
  PageContentBack,
  PageContentDescription,
  PageContentAction,
  PageContentBody,
  PageContentFooter,
};
