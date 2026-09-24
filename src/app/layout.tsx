import type { Metadata } from "next";
import { Montserrat, Roboto } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import { getSession } from "@/lib/auth";
import type { MemberRole } from "@/lib/nav";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "VTG Nordrhein-Westfalen | Verband der Teilnehmergemeinschaften",
  description:
    "Der Verband der Teilnehmergemeinschaften Nordrhein-Westfalen (VTG) ist der Dachverband der Teilnehmergemeinschaften von Bodenordnungsverfahren in Nordrhein-Westfalen.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const role: MemberRole | null = session ? (session.role === "abonnent" ? "abonnent" : "intern") : null;

  return (
    <html
      lang="de"
      className={`${montserrat.variable} ${roboto.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteChrome loggedIn={!!session} role={role} isAdmin={session?.role === "admin"}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
