"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { header2Nav, isFileHref, type NavItem, type MemberRole } from "@/lib/nav";

function DownloadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="ml-1 inline-block h-3.5 w-3.5 align-text-bottom"
    >
      <path d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14.5v1a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Header2Link({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon?: NavItem["icon"];
  children: React.ReactNode;
}) {
  const className = `inline-block border-b-2 py-0.5 text-sm ${
    active
      ? "border-vtg-yellow text-neutral-900"
      : "border-transparent text-neutral-700 hover:text-vtg-orange"
  }`;

  if (isFileHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
        {icon === "download" && <DownloadIcon />}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
      {icon === "download" && <DownloadIcon />}
    </Link>
  );
}

export default function Header2({ role }: { role: MemberRole | null }) {
  const pathname = usePathname();

  if (!role) return null;

  const items = header2Nav[role];

  return (
    <div>
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-1 py-2">
        {items.map((item) => (
          <li key={item.href}>
            <Header2Link href={item.href} active={pathname === item.href} icon={item.icon}>
              {item.label}
            </Header2Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
