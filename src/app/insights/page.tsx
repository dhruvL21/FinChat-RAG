'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/finchat/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/finchat/date-range-picker';
import { useToast } from '@/hooks/use-toast';
import { 
  PieChart as PieChartIcon, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { DateRange } from 'react-day-picker';

const COLORS = ['#234EA8', '#6D3DDE', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#6366f1'];

export default function InsightsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [categoryData, setCategoryData] = useState<{name: string, value: number, color: string}[]>([]);
  const [budgetData, setBudgetData] = useState<{name: string, spent: number, budget: number, percent: number}[]>([]);

  const loadInsights = useCallback(async () => {
    if (!user || !db || !dateRange?.from || !dateRange?.to) return;
    
    setIsLoading(true);
    try {
      const docsSnapshot = await getDocs(collection(db, 'users', user.uid, 'documents'));
      const catMap: Record<string, number> = {};
      
      const start = dateRange.from.toISOString().split('T')[0];
      const end = dateRange.to.toISOString().split('T')[0];

      for (const docSnap of docsSnapshot.docs) {
        const chunksSnapshot = await getDocs(query(
          collection(db, 'users', user.uid, 'documents', docSnap.id, 'chunks'),
          where('transactionDate', '>=', start),
          where('transactionDate', '<=', end)
        ));
        
        chunksSnapshot.forEach(chunk => {
          const data = chunk.data();
          if (data.amount && data.amount > 0) {
            const cat = data.category || 'Miscellaneous';
            catMap[cat] = (catMap[cat] || 0) + data.amount;
          }
        });
      }

      const formattedCat = Object.entries(catMap).map(([name, value], i) => ({
        name,
        value: Math.round(value),
        color: COLORS[i % COLORS.length]
      }));
      setCategoryData(formattedCat);

      // Simple budget logic simulation
      const budgets: Record<string, number> = { 'Food': 600, 'Rent': 2000, 'Travel': 500, 'Shopping': 400 };
      const formattedBudget = Object.entries(budgets).map(([name, budget]) => {
        const spent = catMap[name] || 0;
        return {
          name,
          spent: Math.round(spent),
          budget,
          percent: Math.round((spent / budget) * 100)
        };
      });
      setBudgetData(formattedBudget);

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user, db, dateRange]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const handleReviewCoverage = () => {
    const query = encodeURIComponent("I noticed an insurance coverage gap tip in my insights. Can you analyze my documents and tell me more about what's missing?");
    router.push(`/chat?q=${query}`);
  };

  const handleTransferFunds = () => {
    toast({
      title: "Transfer Initiated",
      description: "Transfer of $500 to High-Yield Savings is being processed.",
    });
  };

  const handleViewSummary = () => {
    const query = encodeURIComponent("Based on my income trends, can you give me a detailed breakdown of my tax liability for the selected period?");
    router.push(`/chat?q=${query}`);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 md:px-8 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10 gap-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h2 className="text-lg font-semibold truncate">Financial Insights</h2>
          </div>
          <DatePickerWithRange onRangeChange={setDateRange} />
        </header>

        <main className="p-4 md:p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-none shadow-sm h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-accent/10 p-2 rounded-lg shrink-0">
                    <PieChartIcon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Spending by Category</CardTitle>
                    <CardDescription className="text-xs">Distribution of expenses for selected range</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[300px] md:h-[350px]">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
                ) : categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No spending data for this period.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-lg shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Budget Tracker</CardTitle>
                    <CardDescription className="text-xs">Spending vs. predefined monthly targets</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 md:space-y-8">
                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
                ) : budgetData.map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className={cn(
                        "font-bold",
                        item.percent > 100 ? "text-red-600" : "text-green-600"
                      )}>
                        ${item.spent} / ${item.budget} ({item.percent}%)
                      </span>
                    </div>
                    <Progress value={Math.min(item.percent, 100)} className={cn(
                      "h-2",
                      item.percent > 100 ? "bg-red-100 [&>div]:bg-red-500" : "bg-green-100 [&>div]:bg-green-500"
                    )} />
                    {item.percent > 100 && (
                      <p className="text-[10px] text-red-600 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Exceeded by ${item.spent - item.budget}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-none bg-primary text-primary-foreground shadow-sm flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <ShieldCheck className="w-8 h-8 mb-4 opacity-50 shrink-0" />
                <h4 className="font-bold mb-2">Insurance Review</h4>
                <p className="text-xs md:text-sm opacity-80 leading-relaxed mb-6 flex-1">
                  We found a potential coverage gap based on your analyzed transactions.
                </p>
                <Button variant="secondary" size="sm" className="w-full text-primary mt-auto" onClick={handleReviewCoverage}>
                  Review Coverage <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
            <Card className="border-none bg-accent text-accent-foreground shadow-sm flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <TrendingUp className="w-8 h-8 mb-4 opacity-50 shrink-0" />
                <h4 className="font-bold mb-2">Savings Tip</h4>
                <p className="text-xs md:text-sm opacity-80 leading-relaxed mb-6 flex-1">
                  Your current surplus could be earning more interest in a high-yield account.
                </p>
                <Button variant="secondary" size="sm" className="w-full text-accent mt-auto" onClick={handleTransferFunds}>
                  Transfer Funds <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
            <Card className="border-none bg-white shadow-sm flex flex-col md:col-span-2 lg:col-span-1">
              <CardContent className="p-6 flex-1 flex flex-col">
                <PieChartIcon className="w-8 h-8 mb-4 text-primary opacity-20 shrink-0" />
                <h4 className="font-bold mb-2 text-foreground">Tax Projection</h4>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mb-6 flex-1">
                  Get a breakdown of your estimated tax liability for the selected period.
                </p>
                <Button variant="outline" size="sm" className="w-full mt-auto" onClick={handleViewSummary}>
                  View Summary <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
