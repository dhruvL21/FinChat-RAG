'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SlidersHorizontal, Check, IndianRupee } from 'lucide-react';
import { formatINR } from '@/lib/financial-engine';

interface AdjustReductionDialogProps {
  category: string;
  currentSpending: number;
  initialReduction: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAdjustment: (category: string, newReduction: number) => void;
}

export function AdjustReductionDialog({
  category,
  currentSpending,
  initialReduction,
  open,
  onOpenChange,
  onSaveAdjustment,
}: AdjustReductionDialogProps) {
  const [reduction, setReduction] = useState(initialReduction.toString());
  const [error, setError] = useState<string | null>(null);

  const numReduction = parseFloat(reduction) || 0;
  const annualSavings = numReduction * 12;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(numReduction) || numReduction <= 0) {
      setError('Please specify a positive reduction amount');
      return;
    }
    if (numReduction > currentSpending) {
      setError(`Reduction cannot exceed total spending in this category (${formatINR(currentSpending)})`);
      return;
    }

    onSaveAdjustment(category, numReduction);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl glass-card border-sky-100 shadow-xl">
        <form onSubmit={handleSave} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="p-2 rounded-xl bg-sky-100 text-blue-600">
                <SlidersHorizontal className="w-4 h-4" />
              </span>
              Adjust Reduction Target: {category}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Fine-tune the amount you comfortably aim to trim from your monthly {category.toLowerCase()} spending.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Current Monthly Spend:</span>
              <span className="font-bold text-slate-900">{formatINR(currentSpending)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Projected Annual Savings:</span>
              <span className="font-bold text-emerald-600">{formatINR(annualSavings)}/yr</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reductionAmount" className="text-xs font-semibold text-slate-700">
              Proposed Monthly Reduction (₹)
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ₹
              </span>
              <Input
                id="reductionAmount"
                type="number"
                min="100"
                max={currentSpending}
                step="100"
                value={reduction}
                onChange={(e) => {
                  setReduction(e.target.value);
                  setError(null);
                }}
                className="pl-8 bg-white border-sky-200 focus-visible:ring-blue-500 rounded-xl font-medium"
              />
            </div>
            {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400 font-medium">Quick presets:</span>
            {[0.1, 0.15, 0.25].map((pct) => {
              const presetVal = Math.round((currentSpending * pct) / 100) * 100;
              return (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setReduction(presetVal.toString())}
                  className="text-[11px] px-2 py-0.5 rounded-lg bg-sky-100/70 hover:bg-sky-200/80 text-blue-800 font-semibold transition-colors"
                >
                  {Math.round(pct * 100)}% ({formatINR(presetVal)})
                </button>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept Adjusted Target</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
