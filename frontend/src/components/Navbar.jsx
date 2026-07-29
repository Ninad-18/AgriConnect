import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sprout, Bell, Languages, LogOut, LineChart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import api from "../lib/api";
import { Button } from "./ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t, lang, toggle } = useI18n();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);

  const loadNotifs = () => {
    if (!user) return;
    api.get("/notifications").then((r) => setNotifs(r.data)).catch(() => {});
  };

  useEffect(() => { loadNotifs(); const id = setInterval(loadNotifs, 20000); return () => clearInterval(id); }, [user]);

  const unread = notifs.filter((n) => !n.read).length;
  const markRead = () => api.post("/notifications/read").then(loadNotifs);

  const doLogout = () => { logout(); navigate("/"); };

  return (
    <header className="sticky top-0 z-40 bg-forest text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to={user ? "/home" : "/"} className="flex items-center gap-2 group" data-testid="nav-logo">
          <div className="w-9 h-9 rounded-lg bg-terracotta flex items-center justify-center">
            <Sprout className="w-5 h-5 text-white" />
          </div>
          <span className="font-head font-extrabold text-xl tracking-tight">AgriBid</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/prices">
            <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white gap-2" data-testid="nav-prices">
              <LineChart className="w-4 h-4" /> <span className="hidden sm:inline">{t("market_prices")}</span>
            </Button>
          </Link>

          <button onClick={toggle} data-testid="lang-toggle"
            className="flex items-center gap-1.5 px-3 py-2 rounded-md hover:bg-white/10 text-sm font-semibold">
            <Languages className="w-4 h-4" /> {lang === "en" ? "EN" : "हिं"}
          </button>

          {user ? (
            <>
              <DropdownMenu onOpenChange={(o) => o && markRead()}>
                <DropdownMenuTrigger asChild>
                  <button className="relative p-2 rounded-md hover:bg-white/10" data-testid="notif-bell">
                    <Bell className="w-5 h-5" />
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-terracotta text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                        {unread}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 bg-white">
                  <DropdownMenuLabel className="font-head">Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifs.length === 0 && <div className="px-3 py-6 text-sm text-muted-foreground text-center">No notifications</div>}
                  {notifs.slice(0, 8).map((n) => (
                    <div key={n.id} className="px-3 py-2 border-b last:border-0" data-testid="notif-item">
                      <p className="font-semibold text-sm text-forest">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.body}</p>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10" data-testid="user-menu">
                    <div className="w-8 h-8 rounded-full bg-ochre text-forest font-bold flex items-center justify-center">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-sm font-semibold max-w-[120px] truncate">{user.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white w-48">
                  <DropdownMenuLabel>
                    <div className="text-forest">{user.name}</div>
                    <Badge className="mt-1 bg-secondary text-forest capitalize">{t(user.role)}</Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/home")} data-testid="menu-dashboard">{t("dashboard")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={doLogout} className="text-terracotta" data-testid="logout-btn">
                    <LogOut className="w-4 h-4 mr-2" /> {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" data-testid="nav-login">{t("login")}</Button></Link>
              <Link to="/register"><Button className="bg-terracotta hover:bg-terracotta/90 text-white" data-testid="nav-register">{t("register")}</Button></Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
