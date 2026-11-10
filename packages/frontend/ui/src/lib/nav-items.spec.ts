import {
  containsUrl,
  findActiveUrl,
  isNavGroup,
  type NavGroup,
  type NavItem,
  type NavNode,
} from "./nav-items.ts";

const admin = {
  label: "Admin",
  url: "/admin",
  children: [
    { label: "Users", url: "/admin/users" },
    {
      label: "Settings",
      children: [{ label: "Mail", url: "/admin/settings/mail" }],
    },
  ],
} satisfies NavGroup<NavNode> & NavItem;

const items: NavItem[] = [
  { label: "Home", url: "/" },
  { label: "Sales", children: [{ label: "Customers", url: "/customers" }] },
  admin,
];

describe("findActiveUrl", () => {
  it("matches / only exactly", () => {
    expect(findActiveUrl(items, "/")).toBe("/");
    expect(findActiveUrl(items, "/unknown")).toBeUndefined();
  });

  it("matches sub-paths, not prefixes of words", () => {
    expect(findActiveUrl(items, "/customers/42")).toBe("/customers");
    expect(findActiveUrl(items, "/customers-old")).toBeUndefined();
  });

  it("picks the most specific url, at any level", () => {
    expect(findActiveUrl(items, "/admin")).toBe("/admin");
    expect(findActiveUrl(items, "/admin/users/1")).toBe("/admin/users");
    expect(findActiveUrl(items, "/admin/settings/mail")).toBe(
      "/admin/settings/mail",
    );
  });

  it("finds nothing without a path", () => {
    expect(findActiveUrl(items, null)).toBeUndefined();
  });
});

describe("containsUrl", () => {
  it("looks through the descendants", () => {
    expect(containsUrl(admin, "/admin/users")).toBe(true);
    expect(containsUrl(admin, "/admin/settings/mail")).toBe(true);
    expect(containsUrl(admin, "/admin")).toBe(false);
    expect(containsUrl(admin, undefined)).toBe(false);
  });
});

describe("NavItem", () => {
  it("allows at most 3 levels", () => {
    const tooDeep: NavItem = {
      label: "1",
      children: [
        {
          label: "2",
          // @ts-expect-error a group can't be on level 3
          children: [{ label: "3", children: [{ label: "4", url: "/4" }] }],
        },
      ],
    };
    expect(tooDeep.label).toBe("1");
  });
});

describe("isNavGroup", () => {
  it("tells groups from leaves", () => {
    expect(isNavGroup(admin)).toBe(true);
    expect(isNavGroup({ label: "Home", url: "/" })).toBe(false);
  });
});
