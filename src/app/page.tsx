'use client';

import { useEffect, useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/finchat/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  CreditCard, 
  Calendar,
  DollarSign
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { getTransactions } from '@/app/lib/actions';
import type { Transaction } from '@/lib/types';

const data = [
  { name: 'Jan', spent: 2400 },
  { name: 'Feb', spent: 1398 },
  { name: 'Mar', spent: 9800 },
  { name: 'Apr', spent: 3908 },
  { name: 'May', spent: 4800 },
  { name: 'Jun', spent: 3800 },
];

export default function DashboardPage() {
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  
  useEffect(() => {
    async function load() {
      const txs = await getTransactions();
      setRecentTransactions(txs.slice(-5).reverse());
    }
    load();
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between px-8 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <h2 className="text-lg font-semibold">Overview</h2>
          <div className="flex items-center gap-4">
            <div className="bg-secondary px-3 py-1 rounded-full flex items-center gap-2 text-sm font-medium">
              <Calendar className="w-4 h-4" />
              <span>Oct 2023 - Mar 2024</span>
            </div>
          </div>
        </header>

        <main className="p-8 space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Total Balance', value: '$12,450.00', trend: '+2.5%', icon: Wallet, color: 'text-primary' },
              { title: 'Monthly Spending', value: '$3,820.00', trend: '-10.2%', icon: CreditCard, color: 'text-accent' },
              { title: 'Savings Rate', value: '24%', trend: '+5.4%', icon: ArrowUpRight, color: 'text-green-600' },
              { title: 'Projected Tax', value: '$1,200.00', trend: 'Neutral', icon: DollarSign, color: 'text-orange-600' },
            ].map((stat, i) => (
              <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className={`text-xs mt-1 ${stat.trend.startsWith('+') ? 'text-green-600' : stat.trend.startsWith('-') ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {stat.trend} from last month
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Spending Chart */}
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader>
                <CardTitle>Spending Trends</CardTitle>
                <CardDescription>Monthly expenditure across all accounts</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      dx={-10}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f3f4f6' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="spent" radius={[4, 4, 0, 0]}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 2 ? 'hsl(var(--accent))' : 'hsl(var(--primary))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest parsed transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-full">
                            <CreditCard className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">{tx.category} • {tx.date}</p>
                          </div>
                        </div>
                        <p className={`text-sm font-bold ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No recent transactions found.</p>
                      <p className="text-xs text-muted-foreground mt-1">Upload a CSV to get started.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}