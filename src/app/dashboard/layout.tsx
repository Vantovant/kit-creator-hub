import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <Outlet />
      </div>
    </div>
  );
}
