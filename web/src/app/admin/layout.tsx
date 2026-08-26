import AdminShell from "@/components/admin/AdminShell";
import { getProfile, getSettings } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [{ data: profile }, settings] = await Promise.all([getProfile(), getSettings()]);
  if (!profile) redirect("/login?next=%2Fadmin");
  if (profile.role !== "admin") redirect("/");

  return (
    <AdminShell email={profile.email} siteName={settings.site_name}>
      {children}
    </AdminShell>
  );
}
