import Image from "next/image";
import Link from "next/link";
import { footerNav } from "@/lib/nav";

export default function Footer() {
  const year = new Date().getFullYear();

  const serviceLinks = footerNav.service;
  const legalLinks = footerNav.legal;

  return (
    <footer className="border-t-[1.5px] border-vtg-yellow bg-white text-neutral-800">
      <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <div className="flex flex-col flex-wrap border-b border-neutral-200 pb-8 sm:flex-row sm:items-start">
          <div className="border-neutral-200 py-4 pr-8 sm:w-[35%] sm:border-b-0">
            <Image
              src="/images/logo/vtg-schrift.png"
              alt="VTG Rheinland-Pfalz Logo"
              width={4006}
              height={1558}
              className="h-[107px] w-auto object-contain"
            />
            <p className="mt-4 text-sm text-neutral-600">
              Verband der Teilnehmergemeinschaften Rheinland-Pfalz.
              <br />
              Körperschaft des öffentliche Rechts.
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-8 py-4 sm:flex-row sm:justify-end sm:gap-16">
            <ul className="flex flex-col gap-1.5 text-sm">
              {serviceLinks.map((item) => (
                <li key={item.href} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 bg-neutral-900" />
                  <Link href={item.href} className="hover:text-vtg-orange">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 py-8 text-sm text-neutral-500 sm:flex-row">
          <p>
            Copyright © {year} Verband der Teilnehmergemeinschaften
            Rheinland-Pfalz. Körperschaft des öffentliche Rechts.
          </p>
          <ul className="flex flex-wrap items-center gap-3">
            {legalLinks.map((item, i) => (
              <li key={item.href} className="flex items-center gap-3">
                {i > 0 && <span>|</span>}
                <Link href={item.href} className="hover:text-vtg-orange">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
