export interface NavItem {
  title: string;
  href: string;
}

export interface NavSection {
  title: string;
  /** Where the section title links to (usually its first page). */
  href: string;
  items: NavItem[];
}

/** Sidebar navigation: sections with their pages. */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Workspace",
    href: "/",
    items: [{ title: "Home", href: "/" }],
  },
  {
    title: "Settings",
    href: "/account",
    items: [{ title: "Account", href: "/account" }],
  },
];

/** The section and page for a path ("/account/x" matches "/account"). */
export function findNavItem(pathname: string) {
  for (const section of NAV_SECTIONS) {
    const item = section.items.find((item) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    if (item) return { section, item };
  }
  return undefined;
}
