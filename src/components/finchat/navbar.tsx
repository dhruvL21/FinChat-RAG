'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Landmark,
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

  return (
    <header className="sticky top-3 sm:top-4 z-50 w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex items-center justify-center relative pointer-events-none">
      
      {/* Center: Ovular Navbar Capsule with App Name + 4 Pages */}
      <nav className="relative flex items-center justify-between w-full max-w-2xl lg:max-w-3xl h-14 sm:h-16 px-4 sm:px-6 rounded-full glass-navbar transition-all duration-300 pointer-events-auto shadow-[0_16px_36px_-6px_rgba(0,0,0,0.15),0_8px_16px_-4px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.06)] border border-slate-200/90">
        
        {/* App Name & Logo */}
        <Link href="/" className="flex items-center gap-2.5 group transition-transform hover:scale-[1.02]">
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-sky-100 border border-sky-200 text-blue-600 shadow-2xs">
            <Landmark className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>

          <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
            Finchat
          </span>
        </Link>

        {/* The 3 Pages with smooth light-blue sliding pill transition (No labels/badges) */}
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
                  "relative z-10 flex items-center gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs font-semibold transition-colors duration-200 group select-none",
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

        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-full bg-sky-50 border border-sky-100 text-blue-600 hover:bg-sky-100 transition-colors"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </nav>

      {/* Top-Right Outside Navbar: Notification Bell & User Avatar */}
      <div className="absolute right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 flex items-center gap-2 sm:gap-2.5 pointer-events-auto">
        {/* Notifications Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-full border border-slate-200/90 bg-white/95 backdrop-blur-xl hover:bg-slate-50 text-slate-700 shadow-[0_8px_18px_-3px_rgba(0,0,0,0.10),0_2px_6px_rgba(0,0,0,0.06)] transition-all"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4 text-slate-700" />
              <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 rounded-2xl glass-card border-sky-100 shadow-xl overflow-hidden" align="end">
            <div className="p-3.5 border-b border-sky-100 bg-sky-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Guardian Intel Feed</span>
              </div>
              <Badge variant="secondary" className="text-[10px] bg-sky-100 text-blue-800 font-bold rounded-full">2 New</Badge>
            </div>
            <div className="divide-y divide-sky-100/60 max-h-72 overflow-y-auto">
              <div className="p-3 hover:bg-sky-50/40 transition-colors flex gap-3 text-xs">
                <div className="p-1.5 bg-amber-50 border border-amber-200 rounded-lg shrink-0 h-fit">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Budget Limit Alert</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Travel expenses have exceeded the target guardrail for this month.</p>
                  <span className="text-[10px] text-sky-600 font-mono mt-1 block">Live Monitoring</span>
                </div>
              </div>
              <div className="p-3 hover:bg-sky-50/40 transition-colors flex gap-3 text-xs">
                <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg shrink-0 h-fit">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Firestore Secure Cloud Active</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Strict ownership rules enforce private user isolation.</p>
                  <span className="text-[10px] text-emerald-600 font-mono mt-1 block">Realtime Protection</span>
                </div>
              </div>
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

        {/* User Profile Dropdown (Light solid color) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-full p-0 ring-2 ring-slate-200 hover:ring-slate-400 overflow-hidden shadow-[0_8px_18px_-3px_rgba(0,0,0,0.10),0_2px_6px_rgba(0,0,0,0.06)] transition-all"
            >
              <Avatar className="h-full w-full rounded-full">
                <AvatarFallback className="bg-sky-100 border border-sky-200 text-blue-700 font-bold text-xs tracking-wider">
                  {user?.uid ? user.uid.substring(0, 2).toUpperCase() : 'UE'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 p-1.5 rounded-2xl glass-card border-sky-100 shadow-xl" align="end">
            <DropdownMenuLabel className="p-2">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-bold text-slate-900">Financial Guardian User</p>
                <p className="text-[10px] text-slate-500 font-mono truncate">
                  {user ? `ID: ${user.uid.substring(0, 14)}...` : 'Anonymous Session'}
                </p>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
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
      </div>

      {/* Mobile Drawer (No badges) */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-4 right-4 p-3 rounded-3xl glass-navbar animate-in fade-in-50 slide-in-from-top-2 duration-200 z-50 pointer-events-auto shadow-xl">
          <div className="flex flex-col space-y-1">
            {navLinks.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center justify-between px-4 py-2.5 rounded-full text-xs font-semibold transition-all duration-200",
                    isActive
                      ? "bg-sky-100 text-blue-700 font-bold border border-sky-200/80"
                      : "text-slate-700 hover:bg-sky-50 hover:text-blue-700"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-blue-600" />
                    <span>{item.name}</span>
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
