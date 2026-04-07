'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  MessageSquare, 
  UploadCloud, 
  PieChart, 
  Settings,
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
  SidebarProvider,
  SidebarFooter
} from '@/components/ui/sidebar';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Financial Chat', href: '/chat', icon: MessageSquare },
  { name: 'Documents', href: '/upload', icon: UploadCloud },
  { name: 'Insights', href: '/insights', icon: PieChart },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3">
          <div className="bg-accent rounded-lg p-2">
            <ShieldCheck className="w-6 h-6 text-accent-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">FinChat AI</h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton 
                asChild 
                isActive={pathname === item.href}
                className="hover:bg-sidebar-accent transition-colors"
              >
                <Link href={item.href} className="flex items-center gap-3 px-3 py-2">
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="bg-sidebar-accent/50 rounded-xl p-4 border border-sidebar-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-sidebar-foreground">Safe Spend Tip</span>
          </div>
          <p className="text-[10px] text-sidebar-foreground/70 leading-relaxed">
            Your food spending is 12% higher than last month. Consider meal prepping!
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}