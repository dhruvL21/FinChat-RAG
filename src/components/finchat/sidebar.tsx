'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  MessageSquare, 
  UploadCloud, 
  PieChart, 
  ShieldCheck,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarFooter
} from '@/components/ui/sidebar';

const navItems = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'FinChat AI', href: '/chat', icon: MessageSquare },
  { name: 'Ledger Docs', href: '/upload', icon: UploadCloud },
  { name: 'Financial Intel', href: '/insights', icon: PieChart },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r-0 shadow-2xl">
      <SidebarHeader className="p-8">
        <div className="flex items-center gap-3">
          <div className="bg-accent rounded-xl p-2.5 shadow-lg shadow-accent/30 border border-white/20">
            <ShieldCheck className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white leading-none">FinChat AI</h1>
            <span className="text-[10px] font-black uppercase text-accent tracking-widest mt-1 block">Elite Guardian</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4 mt-4">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href} className="mb-2">
              <SidebarMenuButton 
                asChild 
                isActive={pathname === item.href}
                className={cn(
                  "hover:bg-sidebar-accent transition-all duration-300 py-6 rounded-xl",
                  pathname === item.href ? "bg-sidebar-accent shadow-md scale-[1.02]" : "opacity-70"
                )}
              >
                <Link href={item.href} className="flex items-center gap-4 px-4">
                  <item.icon className={cn("w-5 h-5", pathname === item.href ? "text-accent" : "")} />
                  <span className="font-bold tracking-tight text-sm uppercase">{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-6">
        <div className="bg-sidebar-accent/40 rounded-2xl p-5 border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-accent" />
            <span className="text-[10px] font-black uppercase text-accent tracking-widest">Guardian Insight</span>
          </div>
          <p className="text-[11px] text-sidebar-foreground/80 leading-relaxed font-medium italic">
            "Discretionary leaks in 'Miscellaneous' are rising. Tighten limits now to protect your Q4 targets."
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
