'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Loader2, 
  PlusCircle
} from 'lucide-react';
import { askFinancialQuestion } from '@/app/lib/actions';
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

function ChatContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q');
  
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { 
      role: 'assistant', 
      content: "Namaste! I'm your FinChat Guardian Assistant. Ask me anything about your uploaded financial documents, bank statements, or overall spending patterns in Rupees (₹)." 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAutoSent, setHasAutoSent] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const db = useFirestore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Handle auto-sending initial query from URL
  useEffect(() => {
    if (mounted && initialQuery && !hasAutoSent && user && db && !isLoading) {
      setHasAutoSent(true);
      handleSend(initialQuery);
    }
  }, [mounted, initialQuery, user, db, hasAutoSent]);

  const handleSend = async (overrideText?: string) => {
    const msgToSend = overrideText || input;
    if (!msgToSend.trim() || isLoading) return;

    if (!overrideText) {
      setInput('');
    }

    setMessages(prev => [...prev, { role: 'user', content: msgToSend }]);
    setIsLoading(true);

    try {
      if (!user || !db) {
        throw new Error("Secure session initializing... Please try again in a moment.");
      }

      // Fetch user's indexed chunks from Firestore
      const docsRef = collection(db, 'users', user.uid, 'documents');
      const docsSnap = await getDocs(docsRef);

      const relevantChunks: any[] = [];
      for (const docSnap of docsSnap.docs) {
        if (docSnap.id.startsWith('settings_')) continue;
        const chunksRef = collection(db, 'users', user.uid, 'documents', docSnap.id, 'chunks');
        const chunksSnap = await getDocs(chunksRef);
        chunksSnap.forEach(chunk => {
          const cData = chunk.data();
          relevantChunks.push({
            text: cData.chunkText || 'Financial transaction record',
            metadata: {
              date: cData.transactionDate || new Date().toISOString().split('T')[0],
              category: cData.category || undefined,
              amount: (cData.amount !== undefined && !isNaN(Number(cData.amount))) ? Number(cData.amount) : undefined,
              fileName: docSnap.data().filename || 'Statement'
            }
          });
        });
      }

      // Fetch Grow My Money settings to provide planner context to the AI
      let plannerContext: any = undefined;
      try {
        const settingsSnap = await getDoc(doc(db, 'users', user.uid, 'documents', 'settings_grow_my_money'));
        if (settingsSnap.exists()) {
          const sData = settingsSnap.data();
          plannerContext = {
            monthlyIncome: sData.monthlyIncome,
            acceptedTargets: sData.acceptedTargets,
            goals: sData.goals?.map((g: any) => ({
              name: g.name,
              targetAmount: g.targetAmount,
              currentSaved: g.currentSaved,
              targetDate: g.targetDate,
            })),
          };
        }
      } catch (pErr) {
        console.warn('Could not load planner context for chat:', pErr);
      }

      const clampedChunks = relevantChunks.slice(0, 45);
      const response = await askFinancialQuestion(msgToSend, clampedChunks, plannerContext);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.answer
      }]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error?.message || "An unexpected error occurred while processing your request. Please try again."}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] overflow-hidden w-full">
      <div className="max-w-4xl mx-auto w-full px-4 pt-2 flex items-center justify-between border-b border-sky-100 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-800">Finchat Mentor</h2>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 shrink-0 border-sky-200 bg-white hover:bg-sky-50 text-slate-700 shadow-2xs text-xs font-semibold rounded-full" 
          onClick={() => setMessages([{ 
            role: 'assistant', 
            content: "Namaste! I'm your FinChat Guardian Assistant. Ask me anything about your uploaded financial documents, bank statements, or overall spending patterns in Rupees (₹)." 
          }])}
        >
          <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">New Session</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={cn(
              "flex gap-4 max-w-4xl mx-auto w-full",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs font-bold text-xs",
              msg.role === 'user' 
                ? "bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 text-white" 
                : "bg-sky-100 text-blue-600 border border-sky-200"
            )}>
              {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            
            <div className={cn(
              "space-y-4 max-w-[90%] md:max-w-[85%]",
              msg.role === 'user' ? "flex flex-col items-end" : "flex flex-col items-start"
            )}
            >
              <div className={cn(
                "p-4 rounded-2xl leading-relaxed text-sm whitespace-pre-wrap",
                msg.role === 'user' 
                  ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white rounded-tr-xs shadow-[0_8px_18px_-2px_rgba(37,99,235,0.25)]" 
                  : "glass-card text-slate-800 rounded-tl-xs border border-slate-200/90 shadow-[0_8px_20px_-3px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]"
              )}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 max-w-4xl mx-auto w-full">
            <div className="w-8 h-8 rounded-full bg-sky-100 text-blue-600 border border-sky-200 flex items-center justify-center shrink-0 shadow-2xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="glass-card rounded-2xl px-4 py-3 text-sm flex items-center gap-2.5 border border-slate-200/90 shadow-[0_8px_20px_-3px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)] text-slate-700">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-xs sm:text-sm font-medium">Guardian analyzing statements & querying indexed knowledge base...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 bg-white/80 backdrop-blur-md border-t border-sky-100">
        <div className="max-w-4xl mx-auto relative">
          <Input 
            placeholder="Ask Guardian AI (e.g. 'How much did I spend on Food last month?', 'Identify waste in travel')..." 
            className="pr-12 py-6 bg-white border border-slate-200/90 focus-visible:ring-slate-300 rounded-2xl shadow-[0_10px_25px_-3px_rgba(0,0,0,0.08),0_3px_8px_-2px_rgba(0,0,0,0.04)] text-xs md:text-sm text-slate-900"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button 
            size="icon" 
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white shadow-sm"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-center mt-2.5 text-slate-400 font-medium">
          FinChat AI operates in Indian Rupees (₹) with private, zero-leakage ownership boundaries.
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <div className="bg-background flex flex-col h-svh overflow-hidden w-full">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}>
        <ChatContent />
      </Suspense>
    </div>
  );
}
