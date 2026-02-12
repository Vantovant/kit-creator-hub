import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarProvider } from "@/components/dashboard/SidebarContext";
import { AIWorkflowAssistant } from "@/components/dashboard/AIWorkflowAssistant";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen(true), []);

  return (
    <SidebarProvider value={toggleSidebar}>
      <div className="min-h-screen bg-muted/30">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64" aria-describedby={undefined}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="lg:pl-64">
          <Outlet />
        </div>
        <AIWorkflowAssistant />
      </div>
    </SidebarProvider>
  );
}
