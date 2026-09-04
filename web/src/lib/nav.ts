export type NavItem = { href: string; label: string; icon: string; badge?: string; hidden?: boolean };
export type NavGroup = { title: string; items: NavItem[] };

const allGroups: NavGroup[] = [
  {
    title: "Monitor",
    items: [
      { href: "/admin", label: "Overview", icon: "LayoutDashboard" },
      { href: "/admin/usage", label: "Usage & Token", icon: "Activity", hidden: true },
      { href: "/admin/logs", label: "Request Logs", icon: "ScrollText" },
    ],
  },
  {
    title: "Kelola",
    items: [
      { href: "/admin/routing", label: "Routing", icon: "Boxes" },
      { href: "/admin/provider", label: "Provider", icon: "Wallet" },
      { href: "/admin/produk", label: "Produk", icon: "Package" },
      { href: "/admin/payment", label: "Payment", icon: "CreditCard" },
      { href: "/admin/telegram", label: "Telegram Bot", icon: "Bot" },
      { href: "/admin/keys", label: "API Keys", icon: "KeyRound" },
      { href: "/admin/users", label: "Users & Role", icon: "Users" },
      { href: "/admin/billing", label: "Billing", icon: "Coins", hidden: true },
    ],
  },
  {
    title: "Sistem",
    items: [
      { href: "/admin/webhooks", label: "Webhooks", icon: "Webhook", hidden: true },
      { href: "/admin/audit", label: "Audit Trail", icon: "ShieldCheck", hidden: true },
      { href: "/admin/settings", label: "Settings", icon: "SlidersHorizontal" },
    ],
  },
];

export const navGroups = allGroups.map((g) => ({ ...g, items: g.items.filter((i) => !i.hidden) }));
export const navFlat = navGroups.flatMap((g) => g.items);
export const navAll = allGroups.flatMap((g) => g.items);
