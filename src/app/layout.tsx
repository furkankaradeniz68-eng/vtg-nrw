import type { Metadata } from "next";
import { Montserrat, Roboto } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
  title: "VTG Rheinland-Pfalz | Verband der Teilnehmergemeinschaften",
  description:
    "Der Verband der Teilnehmergemeinschaften Rheinland-Pfalz (VTG) ist der Dachverband der Teilnehmergemeinschaften von Bodenordnungsverfahren in Rheinland-Pfalz.",
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
        <Header loggedIn={!!session} role={role} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
