'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { PlusCircle, Loader2, AlertCircle } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ExpenseInputSchema, AllowedCategories } from '@/lib/validation';

export interface AddExpenseDialogProps {
  onExpenseAdded?: () => void;
}

export function AddExpenseDialog({ onExpenseAdded }: AddExpenseDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    date: '',
    description: '',
    amount: '',
    category: 'Miscellaneous'
  });

  useEffect(() => {
    setMounted(true);
    setFormData(prev => ({
      ...prev,
      date: new Date().toISOString().split('T')[0]
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!user || !db) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please wait for your session to initialize."
      });
      return;
    }

    // 1. Zod Validation
    const parsedAmount = parseFloat(formData.amount);
    const validationResult = ExpenseInputSchema.safeParse({
      date: formData.date,
      description: formData.description,
      amount: isNaN(parsedAmount) ? 0 : parsedAmount,
      category: formData.category
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]?.message || "Invalid input details provided.";
      setValidationError(firstError);
      return;
    }

    const validatedData = validationResult.data;
    setLoading(true);
    const docId = 'manual_entries';
    const chunkId = Math.random().toString(36).substring(7);

    try {
      // 2. Ensure parent document exists
      const docRef = doc(db, 'users', user.uid, 'documents', docId);
      await setDoc(docRef, {
        id: docId,
        userId: user.uid,
        filename: 'Manual Entries',
        fileType: 'MANUAL',
        uploadDate: new Date().toISOString(),
        status: 'ready'
      }, { merge: true });

      // 3. Add transaction chunk
      const chunkRef = doc(db, 'users', user.uid, 'documents', docId, 'chunks', chunkId);
      await setDoc(chunkRef, {
        id: chunkId,
        documentId: docId,
        chunkText: `${validatedData.date}, ${validatedData.description}, ${validatedData.amount}, ${validatedData.category}`,
        chunkOrder: Date.now(),
        transactionDate: validatedData.date,
        category: validatedData.category,
        amount: validatedData.amount,
        embeddingVector: [0]
      });

      toast({
        title: "Expense Added",
        description: `Successfully logged ₹${validatedData.amount.toLocaleString('en-IN')} for ${validatedData.description}.`
      });
      setOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        category: 'Miscellaneous'
      });
      if (onExpenseAdded) {
        onExpenseAdded();
      }
    } catch (error) {
      console.error("Error saving manual expense:", error);
      toast({
        variant: "destructive",
        title: "Database Error",
        description: "Failed to save expense. Please check your network and try again."
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); setValidationError(null); }}>
      <DialogTrigger asChild>
        <Button className="w-full xs:w-auto justify-center h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs hover:shadow-md hover:shadow-blue-600/20 transition-all gap-1.5 shrink-0">
          <PlusCircle className="w-3.5 h-3.5 text-blue-200" />
          <span>Add Expense</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl border-slate-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">Log New Rupee Expense</DialogTitle>
        </DialogHeader>

        {validationError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input 
              id="date" 
              type="date" 
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Input 
              id="desc" 
              placeholder="e.g. Weekly Groceries" 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input 
              id="amount" 
              type="number" 
              step="0.01" 
              placeholder="0.00" 
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(v) => setFormData({...formData, category: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {AllowedCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
