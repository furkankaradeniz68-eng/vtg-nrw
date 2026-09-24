"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mainNav, isFileHref, type MemberRole, type NavItem } from "@/lib/nav";
import Header2 from "@/components/Header2";

function SubmenuLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  if (isFileHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function DesktopSubmenu({ items }: { items: NavItem[] }) {
  return (
    <ul className="absolute left-0 top-full z-40 min-w-64 divide-y divide-neutral-100 border-b-4 border-vtg-yellow bg-white py-1 shadow-[0_0_60px_rgba(0,0,0,0.1)]">
      {items.map((item) => (
        <li key={item.href} className="group/child relative">
          <SubmenuLink
            href={item.href}
            className="flex items-center justify-between px-4 py-2.5 text-sm text-neutral-800 hover:bg-vtg-yellow hover:text-neutral-900"
          >
            {item.label}
            {item.children && <span className="ml-2 text-xs">›</span>}
          </SubmenuLink>
          {item.children && (
            <ul className="invisible absolute left-full top-0 z-50 min-w-56 divide-y divide-neutral-100 border-b-4 border-vtg-yellow bg-white py-1 opacity-0 shadow-[0_0_60px_rgba(0,0,0,0.1)] transition-opacity duration-150 group-hover/child:visible group-hover/child:opacity-100">
              {item.children.map((child) => (
                <li key={child.href}>
                  <SubmenuLink
                    href={child.href}
                    className="block px-4 py-2.5 text-sm text-neutral-800 hover:bg-vtg-yellow hover:text-neutral-900"
                  >
                    {child.label}
                  </SubmenuLink>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function MobileMenuLink({
  href,
  onClick,
  className,
  children,
}: {
  href: string;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}) {
  if (isFileHref(href)) {
    return (
      <a
        href={href}
        onClick={onClick}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}

function MobileMenu({ items, onNavigate }: { items: NavItem[]; onNavigate: () => void }) {
  const [openLabel, setOpenLabel] = useState<string | null>(null);

  return (
    <ul className="flex flex-col divide-y divide-neutral-200">
      {items.map((item) => (
        <li key={item.href} className="py-1">
          <div className="flex items-center justify-between">
            <MobileMenuLink
              href={item.href}
              onClick={onNavigate}
              className="flex-1 py-2 text-base font-medium text-neutral-900"
            >
              {item.label}
            </MobileMenuLink>
            {item.children && (
              <button
                type="button"
                aria-label={`${item.label} Untermenü öffnen`}
                onClick={() =>
                  setOpenLabel(openLabel === item.label ? null : item.label)
                }
                className="px-3 py-2 text-lg"
              >
                {openLabel === item.label ? "–" : "+"}
              </button>
            )}
          </div>
          {item.children && openLabel === item.label && (
            <ul className="ml-4 flex flex-col gap-1 border-l border-neutral-200 pb-2 pl-4">
              {item.children.map((child) => (
                <li key={child.href}>
                  <MobileMenuLink
                    href={child.href}
                    onClick={onNavigate}
                    className="block py-1.5 text-sm text-neutral-700"
                  >
                    {child.label}
                  </MobileMenuLink>
                  {child.children && (
                    <ul className="ml-3 flex flex-col gap-1 border-l border-neutral-200 pl-3">
                      {child.children.map((grandchild) => (
                        <li key={grandchild.href}>
                          <MobileMenuLink
                            href={grandchild.href}
                            onClick={onNavigate}
                            className="block py-1 text-sm text-neutral-600"
                          >
                            {grandchild.label}
                          </MobileMenuLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Header({
  loggedIn,
  role,
}: {
  loggedIn: boolean;
  role: MemberRole | null;
}) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = loggedIn ? mainNav.filter((item) => item.href !== "/login") : mainNav;

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b-[1.5px] border-vtg-yellow bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-2">
          <Link href="/" className="shrink-0" aria-label="VTG Rheinland-Pfalz Startseite">
            <Image
              src="/images/logo/vtg-schrift.png"
              alt="VTG Rheinland-Pfalz Logo"
              width={4006}
              height={1558}
              priority
              className="h-7 w-auto object-contain md:h-9 lg:h-24"
            />
          </Link>

          <button
            type="button"
            className="flex flex-col gap-1.5 p-2 lg:hidden"
            aria-label="Menü öffnen"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="h-0.5 w-6 bg-neutral-900" />
            <span className="h-0.5 w-6 bg-neutral-900" />
            <span className="h-0.5 w-6 bg-neutral-900" />
          </button>
        </div>

        {role && <Header2 role={role} />}

        <nav className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {navItems.map((item) => (
              <li key={item.href} className="group relative">
                <Link
                  href={item.href}
                  className="relative flex items-center gap-1 py-3 text-base font-normal text-neutral-800 hover:text-vtg-orange"
                >
                  {item.label}
                  {item.children && <span className="text-xs">▾</span>}
                  {item.children && (
                    <span className="absolute inset-x-0 -bottom-px h-1 origin-left scale-x-0 bg-vtg-yellow transition-transform duration-150 group-hover:scale-x-100" />
                  )}
                </Link>
                {item.children && (
                  <div className="invisible absolute opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
                    <DesktopSubmenu items={item.children} />
                  </div>
                )}
              </li>
            ))}
            {loggedIn && (
              <li>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="py-3 text-base font-normal text-neutral-800 hover:text-vtg-orange"
                >
                  Logout
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>

      {mobileOpen && (
        <div className="border-t border-neutral-200 px-4 py-2 lg:hidden">
          <MobileMenu items={navItems} onNavigate={() => setMobileOpen(false)} />
          {loggedIn && (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2 text-left text-base font-medium text-neutral-900"
            >
              Logout
            </button>
          )}
        </div>
      )}
    </header>
  );
}
