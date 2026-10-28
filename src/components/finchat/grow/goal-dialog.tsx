'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, PlusCircle, Calendar, IndianRupee, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { SavingsGoal } from '@/lib/types';
import { SavingsGoalInputSchema } from '@/lib/validation';
import { formatINR } from '@/lib/financial-engine';

interface GoalDialogProps {
  goalToEdit?: SavingsGoal | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaveGoal: (goal: Omit<SavingsGoal, 'id'> & { id?: string }) => Promise<void> | void;
  monthlySurplus?: number;
  trigger?: React.ReactNode;
}

const PRESET_GOALS = [
  { name: 'Emergency Fund (6 Mos)', defaultAmount: 150000, monthsAhead: 12 },
  { name: 'Laptop / Tech Upgrade', defaultAmount: 85000, monthsAhead: 6 },
  { name: 'Annual Vacation', defaultAmount: 60000, monthsAhead: 9 },
  { name: 'Higher Education / Courses', defaultAmount: 50000, monthsAhead: 6 },
  { name: 'General Wealth Builder', defaultAmount: 100000, monthsAhead: 12 },
];

export function GoalDialog({
  goalToEdit,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSaveGoal,
  monthlySurplus = 0,
  trigger,
}: GoalDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentSaved, setCurrentSaved] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form state
  useEffect(() => {
    if (goalToEdit) {
      setName(goalToEdit.name);
      setTargetAmount(goalToEdit.targetAmount.toString());
      setCurrentSaved(goalToEdit.currentSaved.toString());
      setTargetDate(goalToEdit.targetDate);
    } else {
      setName('');
      setTargetAmount('');
      setCurrentSaved('0');
      // Default date: 6 months from today
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      setTargetDate(d.toISOString().split('T')[0]);
    }
    setError(null);
  }, [goalToEdit, open]);

  // Dynamic preview calculation
  const numTarget = parseFloat(targetAmount) || 0;
  const numSaved = parseFloat(currentSaved) || 0;
  const remaining = Math.max(0, numTarget - numSaved);

  let monthsRemaining = 1;
  if (targetDate) {
    const today = new Date();
    const target = new Date(targetDate);
    const diff = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
    monthsRemaining = Math.max(1, diff);
  }
  const requiredMonthly = Math.ceil(remaining / monthsRemaining);
  const isFeasible = monthlySurplus > 0 && monthlySurplus >= requiredMonthly;
  const isExceeded = monthlySurplus > 0 && requiredMonthly > monthlySurplus;

  const handleApplyPreset = (preset: typeof PRESET_GOALS[number]) => {
    setName(preset.name);
    setTargetAmount(preset.defaultAmount.toString());
    const d = new Date();
    d.setMonth(d.getMonth() + preset.monthsAhead);
    setTargetDate(d.toISOString().split('T')[0]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = SavingsGoalInputSchema.safeParse({
      name,
      targetAmount: numTarget,
      currentSaved: numSaved,
      targetDate,
    });

    if (!validation.success) {
      setError(validation.error.errors[0]?.message || 'Please check all fields');
      return;
    }

    try {
      setIsSaving(true);
      await onSaveGoal({
        id: goalToEdit?.id,
        name: name.trim(),
        targetAmount: numTarget,
        currentSaved: numSaved,
        targetDate,
      });
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Could not save savings goal');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {!trigger && !isControlled && (
        <DialogTrigger asChild>
          <Button size="sm" className="h-8 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Savings Goal</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-lg rounded-3xl glass-card border-sky-100 shadow-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="p-2 rounded-xl bg-sky-100 text-blue-600">
                <Target className="w-4 h-4" />
              </span>
              {goalToEdit ? 'Edit Savings Goal' : 'Create a New Savings Goal'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Establish a dedicated target and timeline. FinChat calculates your required monthly contributions automatically.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Presets (Only when creating) */}
          {!goalToEdit && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Quick presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_GOALS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-sky-50 hover:bg-sky-100 text-blue-700 border border-sky-200/80 font-medium transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="goalName" className="text-xs font-semibold text-slate-700">
                Goal Name
              </Label>
              <Input
                id="goalName"
                placeholder="e.g. Emergency Fund or MacBook Pro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white border-sky-200 focus-visible:ring-blue-500 rounded-xl font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="targetAmount" className="text-xs font-semibold text-slate-700">
                  Target Amount (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    ₹
                  </span>
                  <Input
                    id="targetAmount"
                    type="number"
                    min="1000"
                    step="500"
                    placeholder="50000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="pl-7 bg-white border-sky-200 focus-visible:ring-blue-500 rounded-xl font-medium text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currentSaved" className="text-xs font-semibold text-slate-700">
                  Amount Already Saved (₹)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    ₹
                  </span>
                  <Input
                    id="currentSaved"
                    type="number"
                    min="0"
                    step="500"
                    placeholder="0"
                    value={currentSaved}
                    onChange={(e) => setCurrentSaved(e.target.value)}
                    className="pl-7 bg-white border-sky-200 focus-visible:ring-blue-500 rounded-xl font-medium text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="targetDate" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Target Completion Date
              </Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-white border-sky-200 focus-visible:ring-blue-500 rounded-xl font-medium text-xs"
              />
            </div>
          </div>

          {/* Real-time Feasibility Card */}
          {numTarget > 0 && targetDate && (
            <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Remaining to Save:</span>
                <span className="font-bold text-slate-900">{formatINR(remaining)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Time Horizon:</span>
                <span className="font-bold text-slate-900">{monthsRemaining} month{monthsRemaining > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-sky-100">
                <span className="font-semibold text-slate-700">Required Monthly Contribution:</span>
                <span className="font-black text-blue-700 text-sm">{formatINR(requiredMonthly)}/mo</span>
              </div>

              {/* Surplus Feasibility indicator */}
              {isFeasible && (
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium pt-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Feasible within your estimated monthly surplus of {formatINR(monthlySurplus)}.</span>
                </div>
              )}
              {isExceeded && (
                <div className="flex items-start gap-1.5 text-amber-700 bg-amber-50/80 p-2 rounded-xl border border-amber-200/70 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Required contribution ({formatINR(requiredMonthly)}/mo) exceeds your current surplus of {formatINR(monthlySurplus)}/mo. Consider extending your deadline or trimming discretionary expenses.
                  </span>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          <DialogFooter className="gap-2 sm:gap-0 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 shadow-sm"
            >
              <Target className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : goalToEdit ? 'Save Changes' : 'Create Goal'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
