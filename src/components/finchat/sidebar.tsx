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
              
              if (normCat !== 'Salary' && normCat !== 'Income') {
                catMap[normCat] = (catMap[normCat] || 0) + amt;
                totalSpent += amt;
              }
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
    <Sidebar className="border-r border-slate-800/80 bg-[#090d16] text-slate-200 shadow-2xl">
      {/* Brand Header */}
      <SidebarHeader className="p-6 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-blue-900/40">
            <div className="w-full h-full bg-[#090d16] rounded-[10px] flex items-center justify-center">
              <Landmark className="w-5 h-5 text-blue-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#090d16]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold tracking-tight text-white">FinChat AI</h1>
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                PRO
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
              Elite Financial Guardian
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation Links */}
      <SidebarContent className="px-3 py-4">
        <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Navigation
        </div>
        <SidebarMenu className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive}
                  className={cn(
                    "relative flex items-center justify-between py-5 px-3.5 rounded-xl transition-all duration-200 group",
                    isActive 
                      ? "bg-gradient-to-r from-blue-600/20 via-blue-600/10 to-transparent text-white border-l-2 border-blue-500 font-semibold shadow-inner" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  )}
                >
                  <Link href={item.href} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <item.icon className={cn(
                        "w-4 h-4 transition-transform group-hover:scale-110",
                        isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"
                      )} />
                      <span className="text-xs tracking-tight font-medium">{item.name}</span>
                    </div>

                    {item.href === '/' && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Live
                      </span>
                    )}
                    {item.href === '/chat' && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        AI
                      </span>
                    )}
                    {item.href === '/upload' && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        CSV/PDF
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* Security & System Info Pill */}
        <div className="mt-8 px-3">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 font-medium">
              <span>Security Shield</span>
              <span className="text-emerald-400 font-bold">Encrypted</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 font-medium">
              <span>Currency Base</span>
              <span className="text-slate-200 font-bold font-mono">INR (₹)</span>
            </div>
          </div>
        </div>
      </SidebarContent>

      {/* Footer: Guardian Insight */}
      <SidebarFooter className="p-4 border-t border-slate-800/60">
        <div className={cn(
          "rounded-xl p-4 border backdrop-blur-md transition-all shadow-lg",
          insightType === 'alert' 
            ? "bg-rose-950/40 border-rose-500/30 text-rose-200" 
            : insightType === 'healthy' 
            ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200" 
            : "bg-slate-900/80 border-slate-800 text-slate-300"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {insightType === 'alert' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              ) : insightType === 'healthy' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              )}
              <span className={cn(
                "text-[10px] font-extrabold uppercase tracking-widest",
                insightType === 'alert' ? "text-rose-400" : 
                insightType === 'healthy' ? "text-emerald-400" : "text-blue-400"
              )}>
                Guardian Insight
              </span>
            </div>
            <span className="relative flex h-2 w-2">
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                insightType === 'alert' ? "bg-rose-400" : "bg-emerald-400"
              )} />
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                insightType === 'alert' ? "bg-rose-500" : "bg-emerald-500"
              )} />
            </span>
          </div>

          {loadingInsight ? (
            <div className="flex items-center gap-2 text-slate-400 py-1">
              <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
              <span className="text-[10px]">Analyzing financial logs...</span>
            </div>
          ) : (
            <div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-normal italic">
                {insight}
              </p>
              <Link 
                href={`/chat?q=${encodeURIComponent('Analyze the current Guardian Insight alert and recommend actionable steps.')}`}
                className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                <span>Consult Guardian AI</span>
                <span>→</span>
              </Link>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
