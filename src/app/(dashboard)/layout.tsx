import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentUser } from "@/lib/rbac";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Resolve the user on the server so admin-only sidebar sections render on
  // first paint instead of popping in after a client fetch.
  const user = await getCurrentUser();
  const initialUser = user ? { name: user.name, email: user.email, role: user.role } : null;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      <Sidebar initialUser={initialUser} />
      <main className="flex-1 min-w-0 bg-background">{children}</main>
    </div>
  );
}
