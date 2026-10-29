'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard,
  MessageSquare,
  UploadCloud,
  Bell,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
  FileText,
  Menu,
  X,
  TrendingUp
} from 'lucide-react';
import { FinchatBadgeLogo } from '@/components/finchat/finchat-logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/firebase';

const navLinks = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Grow My Money', href: '/grow', icon: TrendingUp },
  { name: 'Finchat', href: '/chat', icon: MessageSquare },
  { name: 'Ledger Docs', href: '/upload', icon: UploadCloud },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Budget Limit Alert',
      description: 'Travel expenses have exceeded the target guardrail for this month.',
      meta: 'Live Monitoring',
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 border-amber-200 text-amber-600',
    },
    {
      id: '2',
      title: 'Firestore Secure Cloud Active',
      description: 'Strict ownership rules enforce private user isolation.',
      meta: 'Realtime Protection',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    },
  ]);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const activeIndex = navLinks.findIndex((item) => {
      if (item.href === '/') return pathname === '/';
      return pathname.startsWith(item.href);
    });

    const activeTab = tabRefs.current[activeIndex !== -1 ? activeIndex : 0];
    if (activeTab) {
      setIndicatorStyle({
        left: activeTab.offsetLeft,
        width: activeTab.offsetWidth,
        opacity: 1,
      });
    }
  }, [pathname]);

  // Shared Notifications Popover element
  const renderNotificationButton = (isMobile = false) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "relative rounded-full border border-slate-200/90 bg-white/95 backdrop-blur-xl hover:bg-slate-50 text-slate-700 transition-all",
            isMobile 
              ? "h-8 w-8 shadow-xs" 
              : "h-10 w-10 sm:h-11 sm:w-11 shadow-[0_12px_24px_-3px_rgba(0,0,0,0.22),0_4px_8px_rgba(0,0,0,0.12)]"
          )}
          aria-label="View notifications"
        >
          <Bell className={cn("text-slate-700", isMobile ? "w-3.5 h-3.5" : "w-4 h-4")} />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 text-[9px] font-black text-white bg-blue-600 rounded-full ring-2 ring-white shadow-2xs">
              {notifications.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-2xl glass-card border-sky-100 shadow-xl overflow-hidden z-[100]" align="end">
        <div className="p-3.5 border-b border-sky-100 bg-sky-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Guardian Intel Feed</span>
          </div>
          {notifications.length > 0 ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] bg-sky-100 text-blue-800 font-bold rounded-full">
                {notifications.length} New
              </Badge>
              <button 
                onClick={() => setNotifications([])}
                className="text-[10px] text-slate-400 hover:text-slate-600 font-medium hover:underline cursor-pointer"
              >
                Clear all
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">All caught up</span>
          )}
        </div>
        <div className="divide-y divide-sky-100/60 max-h-72 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="p-3 hover:bg-sky-50/40 transition-colors flex gap-3 text-xs">
                  <div className={cn("p-1.5 border rounded-lg shrink-0 h-fit", item.iconBg)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                    <span className="text-[10px] text-sky-600 font-mono mt-1 block">{item.meta}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 px-4 text-center">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No new notifications</p>
              <p className="text-[11px] text-slate-400 mt-0.5">You're completely up to date with your finances.</p>
            </div>
          )}
        </div>
        <div className="p-2 border-t border-sky-100 bg-sky-50/40">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs font-semibold text-blue-600 hover:text-blue-700 h-8 rounded-xl"
            onClick={() => router.push('/chat')}
          >
            Ask Finchat for Full Audit →
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  // Shared User Profile Dropdown element
  const renderUserAvatar = (isMobile = false) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "relative rounded-full p-0 ring-2 ring-slate-200 hover:ring-slate-400 overflow-hidden transition-all",
            isMobile 
              ? "h-8 w-8 shadow-xs" 
              : "h-10 w-10 sm:h-11 sm:w-11 shadow-[0_12px_24px_-3px_rgba(0,0,0,0.22),0_4px_8px_rgba(0,0,0,0.12)]"
          )}
        >
          <Avatar className="h-full w-full rounded-full">
            <AvatarFallback className="bg-sky-100 border border-sky-200 text-blue-700 font-bold text-xs tracking-wider">
              {user?.uid ? user.uid.substring(0, 2).toUpperCase() : 'UE'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-1.5 rounded-2xl glass-card border-sky-100 shadow-xl z-[100]" align="end">
        <DropdownMenuLabel className="p-2">
          <div className="flex flex-col space-y-1">
            <p className="text-xs font-bold text-slate-900">Financial Guardian User</p>
            <p className="text-[10px] text-slate-500 font-mono truncate">
              {user ? `ID: ${user.uid.substring(0, 14)}...` : 'Anonymous Session'}
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                Encrypted Workspace
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-sky-100" />
        <DropdownMenuItem 
          className="text-xs cursor-pointer gap-2 py-2 rounded-xl"
          onClick={() => router.push('/')}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
          <span>Financial Intel</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="text-xs cursor-pointer gap-2 py-2 rounded-xl"
          onClick={() => router.push('/grow')}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>Grow My Money</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="text-xs cursor-pointer gap-2 py-2 rounded-xl"
          onClick={() => router.push('/chat')}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Consult Finchat AI</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="text-xs cursor-pointer gap-2 py-2 rounded-xl"
          onClick={() => router.push('/upload')}
        >
          <FileText className="w-3.5 h-3.5 text-sky-600" />
          <span>Manage Statements</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <header className="sticky top-2 sm:top-4 z-50 w-full px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto flex items-center justify-center relative pointer-events-none mt-2 sm:mt-3 mb-5 sm:mb-8">
      
      {/* Center: Ovular Navbar Capsule with App Name + 4 Pages */}
      <nav className="relative flex items-center justify-between w-full max-w-2xl lg:max-w-3xl h-13 sm:h-16 px-3.5 sm:px-6 rounded-full glass-navbar transition-all duration-300 pointer-events-auto shadow-[0_22px_45px_-4px_rgba(0,0,0,0.30),0_12px_24px_-4px_rgba(0,0,0,0.20),0_4px_10px_rgba(0,0,0,0.14)] border border-slate-200/90">
        
        {/* App Name & Logo */}
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group transition-transform hover:scale-[1.02] shrink-0">
          <div className="relative flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-xl overflow-hidden shadow-2xs border border-blue-500/20 group-hover:shadow-md transition-all">
            <FinchatBadgeLogo size={36} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          </div>

          <span className="text-sm sm:text-lg font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
            Finchat
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex relative items-center bg-sky-50/70 p-1 rounded-full border border-sky-100/80 shadow-inner backdrop-blur-md">
          {/* Animated Light Blue Sliding Pill Indicator */}
          <div
            className="absolute top-1 bottom-1 rounded-full bg-sky-100 border border-sky-200/90 shadow-2xs transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity,
            }}
          />

          {navLinks.map((item, index) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                ref={(el) => { tabRefs.current[index] = el; }}
                className={cn(
                  "relative z-10 flex items-center gap-2 px-3.5 lg:px-5 py-1.5 sm:py-2 rounded-full text-xs font-semibold transition-colors duration-200 group select-none whitespace-nowrap",
                  isActive
                    ? "text-blue-700 font-bold"
                    : "text-slate-600 hover:text-blue-700"
                )}
              >
                <Icon className={cn(
                  "w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110",
                  isActive ? "text-blue-600" : "text-sky-600 group-hover:text-blue-600"
                )} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile Action Cluster: Bell + Avatar + Hamburger Menu */}
        <div className="flex md:hidden items-center gap-2">
          {renderNotificationButton(true)}
          {renderUserAvatar(true)}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 border border-sky-100 text-blue-600 hover:bg-sky-100 transition-colors shrink-0"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Desktop Top-Right: Notification Bell & User Avatar (Outside Capsule) */}
      <div className="hidden md:flex absolute right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 items-center gap-2 sm:gap-2.5 pointer-events-auto">
        {renderNotificationButton(false)}
        {renderUserAvatar(false)}
      </div>

      {/* Mobile Menu Dropdown Card */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-3 right-3 p-3 rounded-3xl glass-navbar animate-in fade-in-50 slide-in-from-top-2 duration-200 z-50 pointer-events-auto shadow-2xl border border-slate-200/90 bg-white/95">
          <div className="flex flex-col space-y-1.5">
            {navLinks.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all duration-200",
                    isActive
                      ? "bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-2xs"
                      : "text-slate-700 hover:bg-slate-50 hover:text-blue-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-1.5 rounded-lg",
                      isActive ? "bg-blue-600 text-white" : "bg-sky-50 text-blue-600"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
