import { cn } from "cn";
import type * as React from "react";

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
        "grid auto-rows-min items-start gap-1 has-data-[slot=page-content-action]:grid-cols-[1fr_auto] has-data-[slot=page-content-description]:grid-rows-[auto_auto]",
        className,
      )}
      {...props}
    />
  );
}

function PageContentTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="page-content-title"
      className={cn("font-heading text-xl leading-snug font-medium", className)}
      {...props}
    />
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
  PageContentDescription,
  PageContentAction,
  PageContentBody,
  PageContentFooter,
};
