'use client';

import React, { useState } from 'react';
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
import { 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  ShieldCheck, 
  HelpCircle,
  Building2 
} from 'lucide-react';

interface UnlockPdfDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  onUnlock: (password: string) => Promise<boolean>;
  isUnlocking: boolean;
  errorMessage?: string | null;
}

const BANK_PASSWORD_HINTS = [
  { bank: 'HDFC Bank', formula: 'Customer ID OR PAN (UPPERCASE) + DOB (DDMMYYYY)' },
  { bank: 'SBI', formula: 'Last 5 digits of mobile + DOB (DDMMYYYY)' },
  { bank: 'ICICI Bank', formula: 'First 4 letters of name (lowercase) + DDMM of birth' },
  { bank: 'Axis Bank', formula: 'First 4 letters of name (UPPERCASE) + Customer ID' },
  { bank: 'Kotak Bank', formula: 'CRN (Customer Relationship Number) or DOB (DDMMYYYY)' },
];

export function UnlockPdfDialog({
  isOpen,
  onClose,
  fileName,
  onUnlock,
  isUnlocking,
  errorMessage,
}: UnlockPdfDialogProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password.trim() || isUnlocking) return;
    const success = await onUnlock(password.trim());
    if (success) {
      setPassword('');
      setShowPassword(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isUnlocking && !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-[0_24px_48px_-4px_rgba(0,0,0,0.28)] rounded-3xl p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Unlock Bank Statement PDF
              </DialogTitle>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full inline-block mt-0.5">
                Password Encrypted Statement
              </span>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-500 pt-1 leading-relaxed">
            <span className="font-semibold text-slate-700">&quot;{fileName}&quot;</span> is protected with an encryption password by your bank. Enter your statement password to decrypt, index, and analyze it securely in Finchat.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                Statement Password
              </span>
              <button
                type="button"
                onClick={() => setShowHints(!showHints)}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline"
              >
                <HelpCircle className="w-3 h-3" />
                {showHints ? 'Hide bank formats' : 'Bank password formats?'}
              </button>
            </label>

            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter statement password (e.g. PAN + DOB)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                disabled={isUnlocking}
                className="pr-10 py-5 bg-slate-50/50 border border-slate-200 focus-visible:ring-blue-500 rounded-xl text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-start gap-2 animate-in fade-in-50">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Bank Hints Accordion */}
          {showHints && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px]">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                Common Indian Bank Password Patterns:
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-600">
                {BANK_PASSWORD_HINTS.map((item) => (
                  <li key={item.bank} className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                    <span className="font-bold text-slate-800 shrink-0">{item.bank}:</span>
                    <span className="text-slate-500 font-mono text-[10px]">{item.formula}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Privacy Note */}
          <div className="flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 p-2.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Zero-Leakage Privacy: Your password is only used to decrypt your statement and is never permanently stored.</span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUnlocking}
              className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!password.trim() || isUnlocking}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 gap-2"
            >
              {isUnlocking ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Decrypting & Indexing...
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Unlock & Index Statement
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
