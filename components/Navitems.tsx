"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Companions", href: "/companions" },
  { label: "My Notes", href: "/notes" },
  { label: "Practice", href: "/practice" },
  { label: "My Journey", href: "/my-journey" },
];

const NavItems = () => {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label="Primary navigation">
      {navItems.map(({ label, href }) => {
        const isActive =
          href === "/"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            href={href}
            key={label}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "text-primary bg-primary/8"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
};

export default NavItems;