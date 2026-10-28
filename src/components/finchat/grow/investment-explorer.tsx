'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  ShieldCheck,
  PiggyBank,
  Landmark,
  LineChart,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { formatINR, calculateInvestmentScenario } from '@/lib/financial-engine';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface InvestmentExplorerProps {
  plannedMonthlySavings?: number;
  monthlySurplus?: number;
}

const INSTRUMENTS = [
  {
    id: 'savings',
    title: 'High-Yield Savings Account',
    icon: PiggyBank,
    badge: 'Immediate Liquidity',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    purpose: 'Holding emergency reserves and daily operational cash buffer.',
    liquidity: 'Instant (24/7 ATM/UPI access)',
    riskLevel: 'Ultra Low (Capital guaranteed up to ₹5 Lakh under DICGC)',
    horizon: '< 1 Year (Immediate Needs)',
    typicalReturn: '3.0% – 4.5% p.a.',
    notes: 'Ideal for 3–6 months of essential emergency living expenses.'
  },
  {
    id: 'fd',
    title: 'Bank Fixed Deposit (FD)',
    icon: Landmark,
    badge: 'Capital Preservation',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    purpose: 'Locking in fixed capital for planned expenses with fixed interest.',
    liquidity: 'Moderate (Premature penalty of ~0.5–1% applies)',
    riskLevel: 'Low (Insured by DICGC up to ₹5L per bank)',
    horizon: '1 – 3 Years',
    typicalReturn: '6.5% – 7.5% p.a.',
    notes: 'Best for specific near-term commitments (e.g. fee payments, tuition due in 12 months).'
  },
  {
    id: 'index',
    title: 'Broad Market Index Funds',
    icon: LineChart,
    badge: 'Long-term Compounding',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    purpose: 'Low-cost passive investing tracking top 50 Indian companies (Nifty 50).',
    liquidity: 'High (T+1 trading settlement, no lock-in)',
    riskLevel: 'Moderate to High (Short-term market swings & volatility)',
    horizon: '5+ Years (Long-Term)',
    typicalReturn: '11% – 13% p.a. (Historical long-term CAGR)',
    notes: 'Eliminates fund manager bias; low expense ratios (<0.20%). Perfect for long-term wealth.'
  },
  {
    id: 'mutual_funds',
    title: 'Actively Managed Mutual Funds',
    icon: Layers,
    badge: 'Diversified Growth',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    purpose: 'Professional portfolio manager selecting equities across sectors to beat the index.',
    liquidity: 'High (1% exit load typically if withdrawn within 1 year)',
    riskLevel: 'Moderate to High (Depends on market conditions)',
    horizon: '3 – 5+ Years',
    typicalReturn: '10% – 14% p.a. (Market-linked)',
    notes: 'Higher expense ratios (0.8% - 1.8%). Suitable after basic emergency funds are secured.'
  }
];

const RETURN_PRESETS = [
  { label: 'Fixed Deposit (6.5%)', rate: 6.5, desc: 'Capital Preservation' },
  { label: 'Balanced Hybrid (10.0%)', rate: 10.0, desc: 'Moderate Risk' },
  { label: 'Equity Index (12.0%)', rate: 12.0, desc: 'Long-Term Compounding' },
];

export function InvestmentExplorer({
  plannedMonthlySavings = 5000,
  monthlySurplus = 0
}: InvestmentExplorerProps) {
  // Calculator state
  const [initialLumpsum, setInitialLumpsum] = useState<string>('0');
  const [monthlySIP, setMonthlySIP] = useState<string>(
    plannedMonthlySavings > 0 ? plannedMonthlySavings.toString() : '5000'
  );
  const [durationYears, setDurationYears] = useState<number>(5);
  const [returnRate, setReturnRate] = useState<number>(12);
  const [expandedInstrument, setExpandedInstrument] = useState<string | null>(null);

  const numLumpsum = Math.max(0, parseFloat(initialLumpsum) || 0);
  const numSIP = Math.max(0, parseFloat(monthlySIP) || 0);

  // Deterministic calculation
  const scenario = calculateInvestmentScenario(numLumpsum, numSIP, durationYears, returnRate);

  const chartData = [
    { name: 'Total Invested', amount: scenario.totalInvested, fill: '#38bdf8' },
    { name: 'Est. Wealth Gain', amount: scenario.estimatedWealthGain, fill: '#2563eb' },
    { name: 'Maturity Value', amount: scenario.totalMaturityValue, fill: '#0ea5e9' }
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Flexible Financial Decision Framework */}
      <Card className="glass-card border-sky-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-sky-50/50 border-b border-sky-100 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-sky-100 text-blue-600">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <CardTitle className="text-base sm:text-lg font-black text-slate-900">
                  The Financial Priority Ladder
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Before deploying money into market instruments, evaluate your personal readiness using this sequence:
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit text-[10px] font-bold border-sky-200 text-blue-700 bg-white">
              Decision Framework
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[
              {
                step: '1',
                title: 'Essentials & Fixed Outlays',
                desc: 'Rent, groceries, utility bills, and insurance commitments.',
                status: 'Must fund first',
                statusColor: 'text-rose-700 bg-rose-50 border-rose-200'
              },
              {
                step: '2',
                title: 'High-Interest Debt',
                desc: 'Credit card rollovers (>36% p.a.) or expensive personal loans.',
                status: 'Pay off immediately',
                statusColor: 'text-amber-700 bg-amber-50 border-amber-200'
              },
              {
                step: '3',
                title: 'Emergency Cushion',
                desc: '3 to 6 months of living expenses in liquid savings / FDs.',
                status: 'Guaranteed Safety',
                statusColor: 'text-sky-700 bg-sky-50 border-sky-200'
              },
              {
                step: '4',
                title: 'Near-Term Goals',
                desc: 'Planned targets due in < 3 years (avoid high market volatility).',
                status: 'Short-term Lock-in',
                statusColor: 'text-indigo-700 bg-indigo-50 border-indigo-200'
              },
              {
                step: '5',
                title: 'Long-Term Growth',
                desc: 'Market index funds and equity investments for 5+ years.',
                status: 'Compound Wealth',
                statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }
            ].map((ladder) => (
              <div 
                key={ladder.step}
                className="p-3 rounded-2xl bg-white border border-slate-200/90 flex flex-col justify-between hover:border-slate-300 hover:shadow-[0_12px_22px_-3px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 transition-all shadow-[0_6px_16px_-2px_rgba(0,0,0,0.06),0_2px_4px_rgba(0,0,0,0.04)]"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="w-6 h-6 rounded-full bg-sky-100 text-blue-700 font-black text-xs flex items-center justify-center">
                      {ladder.step}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${ladder.statusColor}`}>
                      {ladder.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    {ladder.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    {ladder.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Educational Instrument Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-600" />
              Investment Vehicle Education
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Clear, transparent breakdown of liquidity, risk profiles, and typical time horizons.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {INSTRUMENTS.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedInstrument === item.id;
            return (
              <div
                key={item.id}
                className="p-4 rounded-3xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-[0_10px_24px_-4px_rgba(0,0,0,0.08),0_4px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_18px_32px_-4px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-2xl bg-sky-50 border border-sky-100 text-blue-600 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</h4>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-blue-700">{item.typicalReturn}</span>
                    <span className="block text-[9px] text-slate-400 font-mono">Indicative Range</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.purpose}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-sky-50">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Liquidity:</span>
                    <span className="font-semibold text-slate-700">{item.liquidity}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Time Horizon:</span>
                    <span className="font-semibold text-slate-700">{item.horizon}</span>
                  </div>
                </div>

                <div className="bg-sky-50/60 p-2.5 rounded-xl border border-sky-100/70 text-[11px] flex items-start gap-1.5 text-slate-600">
                  <Info className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                  <span>{item.notes}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Deterministic Investment Calculator */}
      <Card className="glass-card border-sky-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-sky-50/50 border-b border-sky-100 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-sky-100 text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <CardTitle className="text-base sm:text-lg font-black text-slate-900">
                  Interactive Scenario Calculator
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Deterministic mathematical projection using standard compound interest and annuity formulas.
              </CardDescription>
            </div>
            
            {plannedMonthlySavings > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMonthlySIP(plannedMonthlySavings.toString())}
                className="h-7 text-xs font-bold gap-1 border-sky-200 text-blue-700 hover:bg-sky-100"
              >
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>Use Planned Savings ({formatINR(plannedMonthlySavings)}/mo)</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Inputs */}
            <div className="lg:col-span-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sipAmount" className="text-xs font-semibold text-slate-700">
                  Monthly Contribution (SIP in ₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    ₹
                  </span>
                  <Input
                    id="sipAmount"
                    type="number"
                    min="0"
                    step="500"
                    value={monthlySIP}
                    onChange={(e) => setMonthlySIP(e.target.value)}
                    className="pl-7 bg-white border-sky-200 rounded-xl font-medium text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lumpsumAmount" className="text-xs font-semibold text-slate-700">
                  Initial Lumpsum (Optional, ₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    ₹
                  </span>
                  <Input
                    id="lumpsumAmount"
                    type="number"
                    min="0"
                    step="5000"
                    value={initialLumpsum}
                    onChange={(e) => setInitialLumpsum(e.target.value)}
                    className="pl-7 bg-white border-sky-200 rounded-xl font-medium text-xs"
                  />
                </div>
              </div>

              {/* Time Horizon */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <Label className="font-semibold text-slate-700">Investment Horizon</Label>
                  <span className="font-black text-blue-700">{durationYears} Years</span>
                </div>
                <div className="flex gap-2">
                  {[3, 5, 10, 15, 20].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setDurationYears(yr)}
                      className={`flex-1 py-1 text-xs rounded-xl border font-bold transition-all ${
                        durationYears === yr
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white hover:bg-sky-50 text-slate-600 border-sky-200'
                      }`}
                    >
                      {yr}Y
                    </button>
                  ))}
                </div>
              </div>

              {/* Return Rate Presets */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <Label className="font-semibold text-slate-700">Hypothetical Annual Return</Label>
                  <span className="font-black text-blue-700">{returnRate}% p.a.</span>
                </div>
                <div className="space-y-1.5">
                  {RETURN_PRESETS.map((preset) => (
                    <button
                      key={preset.rate}
                      type="button"
                      onClick={() => setReturnRate(preset.rate)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs font-medium transition-all ${
                        returnRate === preset.rate
                          ? 'bg-sky-100 text-blue-800 border-sky-300 font-bold'
                          : 'bg-white hover:bg-sky-50/70 text-slate-700 border-sky-200/80'
                      }`}
                    >
                      <span>{preset.label}</span>
                      <span className="text-[10px] text-slate-400">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Results & Visual Chart */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4 bg-slate-50/70 p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-[0_10px_24px_-4px_rgba(0,0,0,0.08),0_4px_8px_-2px_rgba(0,0,0,0.04)]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Projected Future Value ({durationYears} Year Horizon)
                </span>
                <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
                  {formatINR(scenario.totalMaturityValue)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Compounded monthly based on your inputs.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-200/70">
                <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.05)]">
                  <span className="text-[10px] font-medium text-slate-400 block">Total Principal Invested:</span>
                  <span className="text-base font-bold text-slate-900 mt-0.5 block">
                    {formatINR(scenario.totalInvested)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.05)]">
                  <span className="text-[10px] font-medium text-emerald-600 font-bold block">Est. Wealth Created:</span>
                  <span className="text-base font-bold text-emerald-600 mt-0.5 block">
                    +{formatINR(scenario.estimatedWealthGain)}
                  </span>
                </div>
              </div>

              {/* Minimal Recharts Representation */}
              <div className="h-28 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip 
                      formatter={(val: number) => [formatINR(val), 'Amount']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #bae6fd', fontSize: '11px' }}
                    />
                    <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Explicit Mandatory Regulatory Disclaimer */}
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[10px] text-amber-800 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  <strong>Illustrative Purpose Only:</strong> Assumptions are purely mathematical projections based on assumed returns. Market investments carry risk, do not guarantee returns, and may lose value. Consult a certified financial planner for individual advice.
                </span>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

    </div>
  );
}
