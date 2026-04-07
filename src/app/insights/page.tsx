'use client';

import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/finchat/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  PieChart as PieChartIcon, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  ShieldCheck
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

const categoryData = [
  { name: 'Rent & EMI', value: 2500, color: '#234EA8' },
  { name: 'Food & Dining', value: 850, color: '#6D3DDE' },
  { name: 'Travel', value: 450, color: '#10b981' },
  { name: 'Shopping', value: 600, color: '#f59e0b' },
  { name: 'Utilities', value: 220, color: '#ef4444' },
];

const budgetData = [
  { name: 'Food', spent: 850, budget: 600, percent: 141 },
  { name: 'Travel', spent: 450, budget: 500, percent: 90 },
  { name: 'Entertainment', spent: 120, budget: 200, percent: 60 },
];

export default function InsightsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleReviewCoverage = () => {
    const query = encodeURIComponent("I noticed an insurance coverage gap tip in my insights. Can you analyze my documents and tell me more about what's missing?");
    router.push(`/chat?q=${query}`);
  };

  const handleTransferFunds = () => {
    toast({
      title: "Transfer Initiated",
      description: "Transfer of $500 to High-Yield Savings is being processed. (Simulation)",
    });
  };

  const handleViewSummary = () => {
    const query = encodeURIComponent("Based on my income trends, can you give me a detailed breakdown of my $3,400 estimated tax liability for next quarter?");
    router.push(`/chat?q=${query}`);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 md:px-8 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h2 className="text-lg font-semibold truncate">Financial Insights</h2>
          </div>
        </header>

        <main className="p-4 md:p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Category Breakdown */}
            <Card className="border-none shadow-sm h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-accent/10 p-2 rounded-lg shrink-0">
                    <PieChartIcon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Spending by Category</CardTitle>
                    <CardDescription className="text-xs">Visual distribution of monthly expenses</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[300px] md:h-[350px]">
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
              </CardContent>
            </Card>

            {/* Overspending Detection */}
            <Card className="border-none shadow-sm h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-lg shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Overspending Alerts</CardTitle>
                    <CardDescription className="text-xs">Alerts based on defined budgets</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 md:space-y-8">
                {budgetData.map((item, i) => (
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

          {/* Intelligent Tips */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-none bg-primary text-primary-foreground shadow-sm flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <ShieldCheck className="w-8 h-8 mb-4 opacity-50 shrink-0" />
                <h4 className="font-bold mb-2">Insurance Review</h4>
                <p className="text-xs md:text-sm opacity-80 leading-relaxed mb-6 flex-1">
                  We found a potential coverage gap in your health insurance based on your recent tax filing.
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
                  You have a surplus in your checking account. Consider moving it to your high-yield savings.
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
                  Estimated tax liability for next quarter is $3,400 based on your current income trends.
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
