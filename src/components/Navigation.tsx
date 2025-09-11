import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "./ChatInterface";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Home, 
  User, 
  Users, 
  Settings, 
  MessageCircle,
  Menu,
  X
} from "lucide-react";

const navigationItems = [
  { icon: Home, label: "Dashboard", path: "/" },
  { icon: User, label: "Profile", path: "/profile" },
  { icon: Users, label: "Social", path: "/social" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function Navigation() {
  const [showChat, setShowChat] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-xl font-bold text-primary">LifeFlow</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="wellness"
                size="sm"
                onClick={() => setShowChat(true)}
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
          
          {/* Mobile Menu Overlay */}
          {showMobileMenu && (
            <div className="absolute top-full left-0 right-0 bg-background border-b shadow-lg">
              <nav className="p-4">
                {navigationItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMobileMenu(false)}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-gradient-primary text-white' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </header>

        {/* Mobile Bottom Tab Bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t">
          <div className="flex items-center justify-around p-2">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-0 ${
                    isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Chat Interface */}
        {showChat && (
          <ChatInterface onClose={() => setShowChat(false)} />
        )}
      </>
    );
  }

  // Desktop Navigation
  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="fixed left-0 top-0 z-40 h-full w-64 bg-background border-r">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary mb-8">LifeFlow</h1>
          
          <div className="space-y-2 mb-8">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-gradient-primary text-white' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <Button
            variant="motivation"
            className="w-full"
            onClick={() => setShowChat(true)}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            AI Coach Chat
          </Button>
        </div>
      </nav>

      {/* Chat Interface */}
      {showChat && (
        <ChatInterface onClose={() => setShowChat(false)} />
      )}
    </>
  );
}