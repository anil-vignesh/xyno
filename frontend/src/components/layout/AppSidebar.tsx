import {
  Blocks,
  Cloud,
  FileText,
  Key,
  LayoutDashboard,
  LogOut,
  Mail,
  Users,
  Zap,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const baseNavItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { title: "SES Integrations", icon: Cloud, path: "/integrations" },
  { title: "Templates", icon: Mail, path: "/templates" },
  { title: "Brand", icon: Blocks, path: "/brand-components" },
  { title: "Events", icon: Zap, path: "/events" },
  { title: "Logs", icon: FileText, path: "/logs" },
  { title: "API Keys", icon: Key, path: "/api-keys" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { environment, setEnvironment } = useEnvironment();

  const navItems = isAdmin
    ? [...baseNavItems, { title: "User Management", icon: Users, path: "/users" }]
    : baseNavItems;

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <h1
          className="cursor-pointer text-xl font-bold tracking-tight"
          onClick={() => navigate("/dashboard")}
        >
          Xyno
        </h1>
        <p className="text-xs text-muted-foreground">Email Management Platform</p>
        {isAdmin && (
          <div className="mt-3 flex rounded-md border p-0.5 bg-muted/50">
            <button
              className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                environment === "sandbox"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setEnvironment("sandbox")}
            >
              Sandbox
            </button>
            <button
              className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
                environment === "production"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setEnvironment("production")}
            >
              Production
            </button>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname.startsWith(item.path)}
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.username}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
