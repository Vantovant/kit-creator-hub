import { useState, useEffect } from "react";
import { Bell, Search, Menu, Moon, Sun, UserPlus, Mail, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSidebarToggle } from "@/components/dashboard/SidebarContext";
import * as Popover from "@radix-ui/react-popover";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
}

export function DashboardHeader({ title, subtitle, searchQuery, onSearchChange, searchPlaceholder }: DashboardHeaderProps) {
  const toggleSidebar = useSidebarToggle();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("vanto-theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("vanto-theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <header className="sticky top-0 z-30 bg-background border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleSidebar ?? undefined}
            className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mr-2 shrink-0">
            <img src="/assets/aplgo-logo.png" alt="APLGO" className="h-6 w-auto" />
            <span className="text-[10px] leading-tight text-muted-foreground font-medium hidden sm:block">
              Accredited Distributors<br />of APLGO
            </span>
          </div>
        <div className="flex items-center gap-4">
          {onSearchChange ? (
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={searchPlaceholder || "Search..."}
                value={searchQuery || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-64 pl-10"
              />
            </div>
          ) : (
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-64 pl-10"
                disabled
              />
            </div>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                type="button"
                className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={8}
                className="z-50 w-80 rounded-lg border border-border bg-card text-card-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
              >
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold font-sans">Notifications</h3>
                </div>
                <div className="py-6 flex flex-col items-center text-center gap-2">
                  <Bell className="w-8 h-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No new notifications</p>
                  <p className="text-xs text-muted-foreground/60">You're all caught up!</p>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>
    </header>
  );
}
