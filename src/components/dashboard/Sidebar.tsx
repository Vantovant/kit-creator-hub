import { Link, useLocation, useNavigate } from "react-router-dom";
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
  LogOut,
  ListOrdered,
  BookOpen,
  Target,
  MessageSquareReply,
  Search,
  Inbox,

} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpg";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Subscribers", href: "/dashboard/subscribers", icon: Users },
  { name: "Plan", href: "/dashboard/plan", icon: Target },
  { name: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { name: "Contacts", href: "/dashboard/contacts", icon: Users },
  { name: "Broadcasts", href: "/dashboard/broadcasts", icon: Mail },
  { name: "Automations", href: "/dashboard/automations", icon: Zap },
  { name: "Sequences", href: "/dashboard/sequences", icon: ListOrdered },
  { name: "Sequence QA", href: "/dashboard/sequences/qa", icon: Search },
  { name: "Forms", href: "/dashboard/forms", icon: FormInput },
  { name: "Templates", href: "/dashboard/templates", icon: Mail },
  { name: "Segments", href: "/dashboard/segments", icon: Users },
  { name: "Integrations", href: "/dashboard/integrations", icon: Zap },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Knowledge Base", href: "/dashboard/knowledge-base", icon: BookOpen },
  { name: "Email", href: "/dashboard/email", icon: MessageSquareReply },
];

const bottomNav = [
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Help", href: "/dashboard/help", icon: HelpCircle },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const pathname = location.pathname;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={logo} alt="Vanto Zazi Mail" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-2xl font-bold tracking-tight">Vanto Zazi</span>
        </Link>
      </div>

      <div className="p-4">
        <Link
          to="/dashboard/broadcasts/new"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Broadcast
        </Link>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "opacity-70 hover:opacity-100 hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {bottomNav.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium opacity-70 hover:opacity-100 hover:bg-sidebar-accent/50 transition-colors"
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-3 p-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm">
            {user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium truncate">{user?.user_metadata?.display_name || "User"}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium opacity-70 hover:opacity-100 hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
