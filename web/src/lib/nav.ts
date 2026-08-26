export type NavItem = { href: string; label: string; icon: string; badge?: string };
export type NavGroup = { title: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    title: "Monitor",
    items: [
      { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
      { href: "/admin/usage", label: "Usage & Token", icon: "Activity" },
      { href: "/admin/logs", label: "Request Logs", icon: "ScrollText" },
    ],
  },
  {
    title: "Kelola",
    items: [
      { href: "/admin/routing", label: "Routing", icon: "Boxes" },
      { href: "/admin/keys", label: "API Keys", icon: "KeyRound" },
      { href: "/admin/users", label: "Users & Role", icon: "Users" },
      { href: "/admin/billing", label: "Billing", icon: "Coins" },
    ],
  },
  {
    title: "Sistem",
    items: [
      { href: "/admin/webhooks", label: "Webhooks", icon: "Webhook" },
      { href: "/admin/audit", label: "Audit Trail", icon: "ShieldCheck" },
      { href: "/admin/settings", label: "Settings", icon: "SlidersHorizontal" },
    ],
  },
];

export const navFlat = navGroups.flatMap((g) => g.items);
