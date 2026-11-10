import type { ComponentType } from "react";

/** An icon component (e.g. from lucide-react). */
export type NavIcon = ComponentType<{ className?: string }>;

/** A page: always has a url. */
export interface NavLeaf {
  label: string;
  url: string;
  icon?: NavIcon;
  children?: never;
}

/** A collapsible group; its url, if any, makes the label a link. */
export interface NavGroup<Child> {
  label: string;
  url?: string;
  icon?: NavIcon;
  /** Open on first render (default true). Always opens on the active page. */
  defaultOpen?: boolean;
  children: Child[];
}

type Level3 = NavLeaf;
type Level2 = NavLeaf | NavGroup<Level3>;
/** A sidebar item: at most 3 levels (group → group → leaf). */
export type NavItem = NavLeaf | NavGroup<Level2>;

/** Any node of the tree, whatever its level. */
export type NavNode = NavLeaf | NavGroup<NavNode>;

export function isNavGroup(item: NavNode): item is NavGroup<NavNode> {
  return Array.isArray(item.children);
}

function matches(url: string, pathname: string) {
  if (url === "/") return pathname === "/";
  return pathname === url || pathname.startsWith(`${url}/`);
}

function* urls(items: readonly NavNode[]): Generator<string> {
  for (const item of items) {
    if (item.url) yield item.url;
    if (isNavGroup(item)) yield* urls(item.children);
  }
}

/**
 * The url of the active item for a path: the most specific match
 * ("/admin/users/1" picks "/admin/users" over "/admin"). "/" only matches
 * itself.
 */
export function findActiveUrl(
  items: readonly NavNode[],
  pathname: string | null | undefined,
): string | undefined {
  if (!pathname) return undefined;
  let best: string | undefined;
  for (const url of urls(items)) {
    if (matches(url, pathname) && (!best || url.length > best.length)) {
      best = url;
    }
  }
  return best;
}

/** Whether a group's descendants (not the group itself) include the url. */
export function containsUrl(
  group: NavGroup<NavNode>,
  url: string | undefined,
): boolean {
  if (!url) return false;
  for (const child of group.children) {
    if (child.url === url) return true;
    if (isNavGroup(child) && containsUrl(child, url)) return true;
  }
  return false;
}
