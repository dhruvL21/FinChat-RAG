'use client';

import { useState } from 'react';
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
import { IndianRupee, Save } from 'lucide-react';
import { UserIncomeInputSchema } from '@/lib/validation';

interface IncomeDialogProps {
  currentIncome: number;
  onSaveIncome: (income: number) => Promise<void> | void;
  trigger?: React.ReactNode;
}

export function IncomeDialog({ currentIncome, onSaveIncome, trigger }: IncomeDialogProps) {
  const [open, setOpen] = useState(false);
  const [incomeInput, setIncomeInput] = useState(currentIncome > 0 ? currentIncome.toString() : '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setIncomeInput(currentIncome > 0 ? currentIncome.toString() : '');
      setError(null);
    }
    setOpen(nextOpen);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedNum = parseFloat(incomeInput.replace(/,/g, ''));
    const validation = UserIncomeInputSchema.safeParse({ monthlyIncome: parsedNum });

    if (!validation.success) {
      setError(validation.error.errors[0]?.message || 'Please enter a valid monthly income');
      return;
    }

    try {
      setIsSaving(true);
      await onSaveIncome(parsedNum);
      setOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to save monthly income');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-7 text-xs font-semibold gap-1.5 border-sky-200 text-blue-700 hover:bg-sky-50">
            <IndianRupee className="w-3.5 h-3.5" />
            <span>{currentIncome > 0 ? 'Edit Income' : 'Set Income'}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl glass-card border-sky-100 shadow-xl">
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="p-2 rounded-xl bg-sky-100 text-blue-600">
                <IndianRupee className="w-4 h-4" />
              </span>
              Monthly Income Setup
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide your regular monthly take-home salary or net income to calculate accurate savings surplus and goal feasibility.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="monthlyIncome" className="text-xs font-semibold text-slate-700">
              Monthly Income in INR (₹)
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ₹
              </span>
              <Input
                id="monthlyIncome"
                type="number"
                min="1000"
                step="500"
                placeholder="e.g. 75000"
                value={incomeInput}
                onChange={(e) => setIncomeInput(e.target.value)}
                className="pl-8 bg-sky-50/40 border-sky-200 focus-visible:ring-blue-500 rounded-xl font-medium"
              />
            </div>
            {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
            <p className="text-[11px] text-slate-400">
              This value remains private to your encrypted session and is used to calculate realistic savings targets.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
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
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Monthly Income'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
