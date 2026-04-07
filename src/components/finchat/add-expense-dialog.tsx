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
import { PlusCircle, Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = [
  'Food', 'Rent', 'EMI', 'Travel', 'Utilities', 'Shopping', 
  'Entertainment', 'Healthcare', 'Education', 'Salary', 
  'Investment', 'Miscellaneous'
];

export function AddExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
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
    if (!user || !db || !formData.amount || !formData.description) return;

    setLoading(true);
    const docId = 'manual_entries';
    const chunkId = Math.random().toString(36).substring(7);

    try {
      // 1. Ensure the parent document exists
      const docRef = doc(db, 'users', user.uid, 'documents', docId);
      await setDoc(docRef, {
        id: docId,
        userId: user.uid,
        filename: 'Manual Entries',
        fileType: 'MANUAL',
        uploadDate: new Date().toISOString(),
        status: 'ready'
      }, { merge: true });

      // 2. Add the chunk (transaction)
      const chunkRef = doc(db, 'users', user.uid, 'documents', docId, 'chunks', chunkId);
      await setDoc(chunkRef, {
        id: chunkId,
        documentId: docId,
        chunkText: `${formData.date}, ${formData.description}, ${formData.amount}`,
        chunkOrder: Date.now(),
        transactionDate: formData.date,
        category: formData.category,
        amount: parseFloat(formData.amount),
        embeddingVector: [0]
      });

      toast({
        title: "Expense Added",
        description: `Successfully logged $${formData.amount} for ${formData.description}.`
      });
      setOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        category: 'Miscellaneous'
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save expense. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle className="w-4 h-4" />
          <span>Add Expense</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
            <Label htmlFor="amount">Amount ($)</Label>
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
                {CATEGORIES.map(cat => (
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
