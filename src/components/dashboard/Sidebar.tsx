"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Mail,
  Zap,
  FormInput,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronDown,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Subscribers", href: "/dashboard/subscribers", icon: Users },
  { name: "Broadcasts", href: "/dashboard/broadcasts", icon: Mail },
  { name: "Automations", href: "/dashboard/automations", icon: Zap },
  { name: "Forms", href: "/dashboard/forms", icon: FormInput },
  { name: "Templates", href: "/dashboard/templates", icon: Mail },
  { name: "Segments", href: "/dashboard/segments", icon: Users },
  { name: "Integrations", href: "/dashboard/integrations", icon: Zap },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
];

const bottomNav = [
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Help", href: "/dashboard/help", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[#1a1a1a] text-white flex flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-white tracking-tight">Kit</span>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="p-4">
        <Link
          href="/dashboard/broadcasts/new"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5CC5DE] hover:bg-[#4AB5CE] text-black font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Broadcast
        </Link>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom navigation */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        {bottomNav.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        ))}
      </div>

      {/* User profile */}
      <div className="p-4 border-t border-gray-800">
        <button
          type="button"
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-[#5CC5DE] flex items-center justify-center text-black font-medium text-sm">
            JD
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-white">John Doe</p>
            <p className="text-xs text-gray-400">john@example.com</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </aside>
  );
}
