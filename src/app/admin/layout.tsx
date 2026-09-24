import Link from "next/link";
import { requireAdminSession } from "@/lib/auth";
import AdminLogoutButton from "@/components/AdminLogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="border-b-4 border-vtg-yellow bg-neutral-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="font-heading text-lg font-bold text-white">VTG Admin-Dashboard</p>
            <p className="text-xs text-neutral-400">Angemeldet als {session.username}</p>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/mitgliederbereich/verfahrensauswahl"
              className="text-sm text-neutral-300 hover:text-white"
            >
              ‹ Zurück zum Mitgliederbereich
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
