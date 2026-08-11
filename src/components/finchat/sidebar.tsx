'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  MessageSquare, 
  UploadCloud, 
  Landmark, 
  TrendingDown,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { cn, parseCSVLine } from '@/lib/utils';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarFooter
} from '@/components/ui/sidebar';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';

const navItems = [
  { name: 'Overview & Intel', href: '/', icon: LayoutDashboard },
  { name: 'FinChat AI', href: '/chat', icon: MessageSquare },
  { name: 'Ledger Docs', href: '/upload', icon: UploadCloud },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const db = useFirestore();

  const [insight, setInsight] = useState<string>('Analyzing financial records...');
  const [insightType, setInsightType] = useState<'alert' | 'normal' | 'healthy'>('normal');
  const [loadingInsight, setLoadingInsight] = useState<boolean>(true);

  useEffect(() => {
    async function generateDynamicInsight() {
      if (!user || !db) {
        setInsight('"Upload bank statements or CSV files to activate live AI guardian intelligence."');
        setInsightType('normal');
        setLoadingInsight(false);
        return;
      }

      try {
        setLoadingInsight(true);
        const docsSnapshot = await getDocs(collection(db, 'users', user.uid, 'documents'));
        
        if (docsSnapshot.empty) {
          setInsight('"Upload bank statements or CSV files in Ledger Docs to activate real-time guardian intelligence."');
          setInsightType('normal');
          setLoadingInsight(false);
          return;
        }

        const catMap: Record<string, number> = {};
        let totalSpent = 0;

        const categoryAliases: Record<string, string> = {
          'food': 'Food', 'dining': 'Food', 'groceries': 'Food', 'restaurants': 'Food', 'swiggy': 'Food', 'zomato': 'Food',
          'rent': 'Rent', 'housing': 'Rent', 'lease': 'Rent',
          'emi': 'EMI', 'loan': 'EMI', 'debt': 'EMI',
          'travel': 'Travel', 'transport': 'Travel', 'uber': 'Travel', 'ola': 'Travel', 'fuel': 'Travel',
          'shopping': 'Shopping', 'clothing': 'Shopping', 'fashion': 'Shopping', 'amazon': 'Shopping',
          'utilities': 'Utilities', 'bills': 'Utilities', 'electricity': 'Utilities', 'wifi': 'Utilities'
        };

        for (const docSnap of docsSnapshot.docs) {
          const chunksSnapshot = await getDocs(collection(db, 'users', user.uid, 'documents', docSnap.id, 'chunks'));
          chunksSnapshot.forEach(chunk => {
            const data = chunk.data();
            const rawText = data.chunkText || '';
            const parsed = parseCSVLine(rawText);
            const amt = (data.amount !== undefined && !isNaN(Number(data.amount)) && Number(data.amount) > 0) 
              ? Number(data.amount) 
              : parsed.amount;

            if (amt > 0) {
              const rawCat = data.category && data.category !== 'Miscellaneous' ? data.category : parsed.category;
              const lower = (rawCat || '').trim().toLowerCase();
              const normCat = categoryAliases[lower] || (rawCat ? rawCat.charAt(0).toUpperCase() + rawCat.slice(1) : 'Miscellaneous');
              
              catMap[normCat] = (catMap[normCat] || 0) + amt;
              totalSpent += amt;
            }
          });
        }

        const defaultBudgets: Record<string, number> = { 
          'Food': 15000, 
          'Rent': 45000, 
          'EMI': 25000,
          'Travel': 10000, 
          'Shopping': 8000, 
          'Utilities': 5000 
        };

        // Check for budget breaches
        let breachMessage = '';
        for (const [cat, spent] of Object.entries(catMap)) {
          const limit = defaultBudgets[cat] || 10000;
          if (spent > limit) {
            const excess = Math.round(spent - limit);
            breachMessage = `Budget limit breached in '${cat}' by ₹${excess.toLocaleString('en-IN')}. Tighten limits to protect your targets.`;
            break;
          }
        }

        if (breachMessage) {
          setInsight(`"${breachMessage}"`);
          setInsightType('alert');
        } else if (totalSpent > 0) {
          const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
          if (sortedCats.length > 0) {
            const [topCat, topAmt] = sortedCats[0];
            setInsight(`"${topCat} accounts for your highest expenditure at ₹${Math.round(topAmt).toLocaleString('en-IN')}. Overall spending is well managed."`);
            setInsightType('healthy');
          } else {
            setInsight('"All expense categories are currently within healthy guardrail limits."');
            setInsightType('healthy');
          }
        } else {
          setInsight('"No expense activity detected in your indexed financial documents."');
          setInsightType('normal');
        }
      } catch (err) {
        console.error("Error generating Guardian Insight:", err);
        setInsight('"Upload bank statements to activate real-time guardian intelligence."');
        setInsightType('normal');
      } finally {
        setLoadingInsight(false);
      }
    }

    generateDynamicInsight();
  }, [user, db, pathname]);

  return (
    <Sidebar className="border-r-0 shadow-2xl">
      <SidebarHeader className="p-8">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-accent to-primary rounded-xl p-2.5 shadow-lg shadow-accent/20 border border-white/10">
            <Landmark className="w-6 h-6 text-white" />
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
        <div className={cn(
          "rounded-2xl p-5 border backdrop-blur-md transition-all",
          insightType === 'alert' ? "bg-red-500/15 border-red-500/30" : 
          insightType === 'healthy' ? "bg-green-500/15 border-green-500/30" : "bg-sidebar-accent/40 border-white/5"
        )}>
          <div className="flex items-center gap-2 mb-3">
            {insightType === 'alert' ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : insightType === 'healthy' ? (
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 text-accent shrink-0" />
            )}
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              insightType === 'alert' ? "text-red-400" : 
              insightType === 'healthy' ? "text-green-400" : "text-accent"
            )}>
              Guardian Insight
            </span>
          </div>
          {loadingInsight ? (
            <div className="flex items-center gap-2 text-sidebar-foreground/60 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-[10px]">Analyzing data...</span>
            </div>
          ) : (
            <p className="text-[11px] text-sidebar-foreground/90 leading-relaxed font-medium italic">
              {insight}
            </p>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
