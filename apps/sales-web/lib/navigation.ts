import type { MessageKeys, Messages, NestedKeyOf } from "next-intl";
import {
  CalendarClockIcon,
  ContactIcon,
  HouseIcon,
  UserIcon,
  UsersIcon, ServerIcon, CpuIcon, BotIcon, UsersRoundIcon, RulerIcon, ArrowRightLeftIcon, FileTextIcon, type LucideIcon,
  ListClockIcon,
  GroceriesIcon,
  PackageIcon,
  BoxesLinkedIcon,
  BriefcaseBusinessIcon, KeyRoundIcon,
  LayoutDashboardIcon,
  SparklesIcon,
  BoxDashedIcon, SettingsIcon
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
  /** Only shown to super-admins (e.g. the AI assistant's settings). */
  superAdminOnly?: boolean;
}

/** A group of pages inside a section (the sidebar's third level). */
export interface NavGroup {
  title: NavTitle;
  /** Shown for the group when the sidebar is minimized to a rail. */
  icon?: LucideIcon;
  items: NavItem[];
  /** Only shown to super-admins (e.g. the AI assistant's settings). */
  superAdminOnly?: boolean;
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
  /** Only shown to super-admins. */
  superAdminOnly?: boolean;
  /** Only used to show breadcrumb. */
  hidden?: boolean;
}

/** Sidebar navigation: sections with their pages. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "home",
    href: "/",
    icon: HouseIcon,
    items: [{ title: "dashboard", href: "/", icon: LayoutDashboardIcon }],
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
      {
        title: "products",
        icon: GroceriesIcon,
        items: [
          { title: "products", href: "/products", icon: GroceriesIcon },
          { title: "uoms", href: "/uoms", icon: RulerIcon },
          { title: "uomConversions", href: "/uom-conversions", icon: ArrowRightLeftIcon },
        ],
      },
      { title: "quotations", href: "/quotations", icon: BoxDashedIcon },
      { title: "salesOrders", href: "/sales-orders", icon: PackageIcon },
    ],
  },
  {
    title: "account",
    href: "/account",
    // Most specific first: "/account/password" also matches "/account".
    items: [
      { title: "changePassword", href: "/account/password", icon: KeyRoundIcon },
      { title: "account", href: "/account", icon: UserIcon },
    ],
    hidden: true,
  },
  // Admin
  {
    title: "settings",
    href: ".",
    icon: SettingsIcon,
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
        items: [
          { title: "users", href: "/admin/users", icon: UsersIcon },
          { title: "userGroups", href: "/admin/user-groups", icon: UsersRoundIcon },
        ],
      },
      {
        title: "assistant",
        icon: SparklesIcon,
        superAdminOnly: true,
        items: [
          { title: "assistantAgents", href: "/admin/assistant-agents", icon: BotIcon },
          { title: "assistantModels", href: "/admin/assistant-models", icon: CpuIcon },
          { title: "assistantProviders", href: "/admin/assistant-providers", icon: ServerIcon },
        ],
      },
      { title: "documentTemplates", href: "/document-templates", icon: FileTextIcon },
      { title: "tasks", href: "/admin/tasks", icon: CalendarClockIcon },
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
        if (matches(entry, pathname)) {
          return { section, item: entry };
        }
        continue;
      }
      const item = entry.items.find((page) => matches(page, pathname));
      if (item) {
        return { section, group: entry, item };
      }
    }
  }
  return undefined;
}
