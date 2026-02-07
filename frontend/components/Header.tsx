"use client";

import { ConnectButton } from "./ConnectButton";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Briefcase, User, LayoutDashboard } from "lucide-react";

const navItems = [
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: User },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 flex items-center justify-center border border-white/[0.15] rounded-xl group-hover:border-white/30 transition-colors">
              <Flame className="w-4 h-4 text-white/80" />
            </div>
            <span className="text-base font-medium text-white tracking-wide">
              Veriflare
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                    isActive
                      ? "text-white bg-white/[0.06]"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Wallet Connect */}
          <div className="flex items-center gap-4">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}
