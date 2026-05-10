import { Link, useLocation } from "react-router-dom";
import { BookOpen, MessageSquare, LogOut, Upload, Home, Settings as SettingsIcon } from "lucide-react";
import { cn } from "../lib/utils";

interface NavbarProps {
  user: any;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Chat", href: "/chat", icon: MessageSquare },
    { name: "Upload", href: "/upload", icon: Upload },
  ];

  if (user.role === "admin") {
    navItems.push({ name: "Settings", href: "/settings", icon: SettingsIcon });
  }

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/90 backdrop-blur-md pb-safe z-50">
        <nav className="flex justify-around items-center p-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-w-[56px] flex-1",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center p-2 min-w-[56px] flex-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        </nav>
      </div>

      {/* Desktop Sidebar Navigation */}
      <div className="hidden md:flex w-64 h-screen border-r border-border bg-card flex-col justify-between shrink-0 transition-all">
        <div className="p-4 flex flex-col h-full">
          <div className="mb-8 pt-2 items-center flex justify-start">
            <span className="text-3xl mr-2">✈️</span>
            <div>
              <h1 className="text-2xl font-black tracking-tighter">FLY<span className="text-primary">.</span></h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">Study With Friends</p>
            </div>
          </div>

          <nav className="space-y-2 flex-1 mt-6">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center p-3 rounded-lg transition-colors group",
                    isActive 
                      ? "bg-secondary text-foreground font-medium" 
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-border pt-4">
            <div className="flex items-center mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium truncate">{user.displayName || user.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-start p-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
