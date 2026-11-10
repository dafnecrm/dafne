import type { MessageKeys, Messages, NestedKeyOf } from "next-intl";
import {
  ContactIcon,
  HouseIcon,
  UserIcon,
  UsersIcon, type LucideIcon,
  ListClockIcon,
  GroceriesIcon,
  PackageIcon,
  BoxesLinkedIcon,
  BriefcaseBusinessIcon,
  ShieldIcon,
  KeyRoundIcon,
} from "lucide-react";

/**
 * A title: a key of the `nav` messages, translated where it's shown.
 * Nested messages use dotted paths (`customers.list`).
 */
export type NavTitle = MessageKeys<
  Messages["nav"],
  NestedKeyOf<Messages["nav"]>
>;

export interface NavItem {
  title: NavTitle;
  href: string;
  /** Shown when the sidebar is minimized to a rail. */
  icon: LucideIcon;
}

/** A group of pages inside a section (the sidebar's third level). */
export interface NavGroup {
  title: NavTitle;
  /** Shown for the group when the sidebar is minimized to a rail. */
  icon?: LucideIcon;
  items: NavItem[];
}

export interface NavSection {
  title: NavTitle;
  /** Where the section title links to (usually its first page). */
  href: string;
  items: (NavItem | NavGroup)[];
  /** Shown for the section when the sidebar is minimized to a rail. */
  icon?: LucideIcon;
  /** Only shown to users with the `admin` role. */
  adminOnly?: boolean;
  /** Only used to show breadcrumb. */
  hidden?: boolean;
}

/** Sidebar navigation: sections with their pages. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "home",
    href: "/",
    icon: HouseIcon,
    items: [{ title: "dashboard", href: "/", icon: HouseIcon }],
  },
  {
    title: "sales",
    href: "#",
    icon: BriefcaseBusinessIcon,
    items: [
      { 
        title: "customers", 
        href: "/customers", 
        icon: ContactIcon,
      },
      { title: "activities", href: "/activities", icon: ListClockIcon },
      { title: "products", href: "/products", icon: GroceriesIcon },
      { title: "orders", href: "/sales-orders", icon: PackageIcon },
    ],
  },
  {
    title: "account",
    href: "/account",
    items: [{ title: "account", href: "/account", icon: UserIcon }],
    hidden: true,
  },
  // Admin
  {
    title: "admin",
    href: ".",
    icon: ShieldIcon,
    adminOnly: true,
    items: [
      {
        title: "sales",
        icon: BriefcaseBusinessIcon,
        items: [
          { title: "salesOrderTypes", href: "/admin/sales-order-types", icon: BoxesLinkedIcon },
        ],
      },
      {
        title: "access",
        icon: KeyRoundIcon,
        items: [{ title: "users", href: "/admin/users", icon: UsersIcon }],
      },
    ],
  },
];

export function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return "items" in item;
}

function matches(item: NavItem, pathname: string) {
  return item.href === "/"
    ? pathname === "/"
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * The section, group (if the page is in one) and page for a path
 * ("/account/x" matches "/account").
 */
export function findNavItem(
  pathname: string,
): { section: NavSection; group?: NavGroup; item: NavItem } | undefined {
  for (const section of NAV_SECTIONS) {
    for (const entry of section.items) {
      if (!isNavGroup(entry)) {
        if (matches(entry, pathname)) return { section, item: entry };
        continue;
      }
      const item = entry.items.find((page) => matches(page, pathname));
      if (item) return { section, group: entry, item };
    }
  }
  return undefined;
}
