export type NavItem = {
  label: string;
  href: string;
  children?: NavItem[];
  icon?: "download";
};

// Links to static files (PDF/ZIP/...) must use a plain <a>, not next/link's
// client-side router — the router expects an RSC payload back and throws
// when a binary file is returned instead, crashing the whole page.
export function isFileHref(href: string): boolean {
  return /\.[a-z0-9]{2,4}$/i.test(href);
}

// VTG NRW ist ein abgespeckter Fork von vtg-rlp: nur Startseite und
// Login/Mitgliederbereich existieren, der volle RLP-Webauftritt (Über uns,
// Satzung, Kontaktstandorte, Downloads, Ausschreibungen etc.) wurde entfernt
// (siehe git-Historie). mainNav enthaelt deshalb bewusst nur den Login-Link.
export const mainNav: NavItem[] = [{ label: "Login", href: "/login" }];

export type MemberRole = "abonnent" | "intern";

export const header2Nav: Record<MemberRole, NavItem[]> = {
  abonnent: [
    { label: "Verfahrensdaten", href: "/mitgliederbereich/verfahrensdaten" },
  ],
  intern: [
    { label: "Verfahrensauswahl", href: "/mitgliederbereich/verfahrensauswahl" },
    { label: "Verfahrensdaten", href: "/mitgliederbereich/verfahrensdaten" },
  ],
};

export const footerNav = {
  legal: [
    { label: "Datenschutzerklärung", href: "/datenschutzerklaerung" },
    { label: "Impressum", href: "/impressum" },
  ],
  service: [{ label: "Startseite", href: "/" }],
};
