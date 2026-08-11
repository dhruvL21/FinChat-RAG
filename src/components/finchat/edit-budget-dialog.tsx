'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings2, Loader2, Save } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export interface EditBudgetDialogProps {
  currentBudgets: Record<string, number>;
  onBudgetsUpdated?: (updated: Record<string, number>) => void;
}

export function EditBudgetDialog({ currentBudgets, onBudgetsUpdated }: EditBudgetDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [budgets, setBudgets] = useState<Record<string, number>>(currentBudgets);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    setBudgets(currentBudgets);
  }, [currentBudgets]);

  const handleInputChange = (category: string, value: string) => {
    const num = parseFloat(value);
    setBudgets(prev => ({
      ...prev,
      [category]: isNaN(num) ? 0 : num
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Always save to local storage immediately
      if (typeof window !== 'undefined') {
        localStorage.setItem('finchat_custom_budgets', JSON.stringify(budgets));
      }

      // 2. Save to Firestore under documents subcollection (guaranteed permission path)
      if (user && db) {
        try {
          const docRef = doc(db, 'users', user.uid, 'documents', 'settings_budgets');
          await setDoc(docRef, {
            id: 'settings_budgets',
            userId: user.uid,
            filename: 'Budget Guardrails Config',
            fileType: 'SETTINGS',
            budgets,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (fsErr) {
          console.warn("Firestore budget save warning, using localStorage fallback:", fsErr);
        }
      }

      toast({
        title: "Budget Guardrails Updated",
        description: "Your custom monthly category limits have been saved."
      });

      if (onBudgetsUpdated) {
        onBudgetsUpdated(budgets);
      }
      setOpen(false);
    } catch (error) {
      console.error("Error saving budget limits:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save custom budget limits."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs font-bold gap-1.5 border-primary/20 hover:bg-primary/5 text-primary">
          <Settings2 className="w-3.5 h-3.5" />
          <span>Edit Limits</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Edit Budget Limits</DialogTitle>
          <DialogDescription className="text-xs">
            Set custom monthly spending caps (in ₹ INR) for real-time guardrail tracking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(budgets).map(([cat, limit]) => (
              <div key={cat} className="space-y-1.5 bg-muted/30 p-2.5 rounded-xl border border-muted">
                <Label htmlFor={`limit-${cat}`} className="text-xs font-bold flex items-center justify-between">
                  <span>{cat}</span>
                  <span className="text-[10px] text-muted-foreground font-semibold">₹ INR</span>
                </Label>
                <Input 
                  id={`limit-${cat}`} 
                  type="number" 
                  step="100" 
                  min="0"
                  value={limit}
                  onChange={(e) => handleInputChange(cat, e.target.value)}
                  className="h-8 text-xs font-bold"
                  required
                />
              </div>
            ))}
          </div>

          <DialogFooter className="pt-2">
            <Button type="submit" className="w-full font-bold gap-2" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Budget Limits
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
