'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/finchat/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between px-8 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <h2 className="text-lg font-semibold">Financial Insights</h2>
        </header>

        <main className="p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Category Breakdown */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-accent/10 p-2 rounded-lg">
                    <PieChartIcon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle>Spending by Category</CardTitle>
                    <CardDescription>Visual distribution of your monthly expenses</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Overspending Detection */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle>Overspending Detection</CardTitle>
                    <CardDescription>Alerts based on your defined budgets</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {budgetData.map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
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
                        You've exceeded your {item.name.toLowerCase()} budget by ${item.spent - item.budget}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Intelligent Tips */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none bg-primary text-primary-foreground shadow-sm">
              <CardContent className="p-6">
                <ShieldCheck className="w-8 h-8 mb-4 opacity-50" />
                <h4 className="font-bold mb-2">Insurance Review</h4>
                <p className="text-sm opacity-80 leading-relaxed mb-4">
                  We found a potential coverage gap in your health insurance based on your recent tax filing.
                </p>
                <Button variant="secondary" size="sm" className="w-full text-primary">
                  Review Coverage <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
            <Card className="border-none bg-accent text-accent-foreground shadow-sm">
              <CardContent className="p-6">
                <TrendingUp className="w-8 h-8 mb-4 opacity-50" />
                <h4 className="font-bold mb-2">Investment Opportunity</h4>
                <p className="text-sm opacity-80 leading-relaxed mb-4">
                  You have a surplus of $1,200 in your checking account. Consider moving it to your high-yield savings.
                </p>
                <Button variant="secondary" size="sm" className="w-full text-accent">
                  Transfer Funds <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
            <Card className="border-none bg-white shadow-sm">
              <CardContent className="p-6">
                <PieChartIcon className="w-8 h-8 mb-4 text-primary opacity-20" />
                <h4 className="font-bold mb-2 text-foreground">Tax Projection</h4>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Estimated tax liability for next quarter is $3,400. You are on track based on your income chunks.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  View Tax Summary <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}