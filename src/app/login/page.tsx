import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "Login | VTG Rheinland-Pfalz" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ abgelaufen?: string }> }) {
  const { abgelaufen } = await searchParams;
  return (
    <>
      <PageHero title="Mitglieder-Login" subtitle="Melden Sie sich mit Ihren Zugangsdaten an." />
      <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
        {abgelaufen && (
          <p className="mb-6 rounded border border-vtg-yellow bg-yellow-50 px-4 py-3 text-sm text-neutral-800">
            Sie wurden wegen Inaktivität automatisch abgemeldet. Bitte melden Sie sich erneut an.
          </p>
        )}
        <LoginForm />
      </section>
    </>
  );
}
