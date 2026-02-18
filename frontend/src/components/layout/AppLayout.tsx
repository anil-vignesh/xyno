import { Outlet } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export function AppLayout() {
  const { theme, setTheme } = useTheme();

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
