'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/finchat/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Loader2, 
  PlusCircle,
  MessageSquare
} from 'lucide-react';
import { askFinancialQuestion } from '@/app/lib/actions';
import { cn } from '@/lib/utils';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';

function ChatContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q');
  
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { 
      role: 'assistant', 
      content: "Hello! I'm your FinChat Assistant. Ask me anything about your uploaded financial documents, bank statements, or overall spending patterns." 
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

  const handleSend = async (customMsg?: string) => {
    const msgToSend = customMsg || input.trim();
    if (!msgToSend || isLoading || !user || !db) return;

    if (!customMsg) setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: msgToSend }]);
    setIsLoading(true);

    try {
      const docsSnapshot = await getDocs(collection(db, 'users', user.uid, 'documents'));
      const relevantChunks: any[] = [];
      
      // Limit context to prevent hitting context length or token rate limits
      for (const docSnap of docsSnapshot.docs) {
        const chunksSnapshot = await getDocs(query(
          collection(db, 'users', user.uid, 'documents', docSnap.id, 'chunks'), 
          orderBy('transactionDate', 'desc'),
          limit(30)
        ));
        chunksSnapshot.forEach(chunk => {
          const data = chunk.data();
          relevantChunks.push({
            text: data.chunkText,
            metadata: {
              date: data.transactionDate || 'Unknown',
              category: data.category,
              amount: data.amount,
              fileName: docSnap.data().filename
            }
          });
        });
      }

      const response = await askFinancialQuestion(msgToSend, relevantChunks);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.answer
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I encountered an error while analyzing your data. This might be due to API rate limits. Please try again in a few seconds." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="bg-background flex flex-col h-svh overflow-hidden w-full">
      <header className="flex h-16 shrink-0 items-center justify-between px-4 md:px-8 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10 gap-2">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <div className="flex items-center gap-3 truncate">
            <MessageSquare className="w-5 h-5 text-primary shrink-0" />
            <h2 className="text-lg font-semibold truncate">Financial Chat</h2>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setMessages([{ 
          role: 'assistant', 
          content: "Hello! I'm your FinChat Assistant. Ask me anything about your uploaded financial documents, bank statements, or overall spending patterns." 
        }])}>
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">New Analysis</span>
        </Button>
      </header>

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
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              msg.role === 'user' ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
            )}>
              {msg.role === 'user' ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            
            <div className={cn(
              "space-y-4 max-w-[90%] md:max-w-[85%]",
              msg.role === 'user' ? "flex flex-col items-end" : "flex flex-col items-start"
            )}>
              <Card className={cn(
                "border-none shadow-sm",
                msg.role === 'user' ? "bg-white text-foreground" : "bg-primary/5 text-foreground"
              )}>
                <CardContent className="p-3 md:p-4 leading-relaxed text-sm whitespace-pre-wrap">
                  {msg.content}
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 max-w-4xl mx-auto w-full">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-primary/5 rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs sm:text-sm">Analyzing data and generating insights...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-8 bg-white/50 backdrop-blur-md border-t">
        <div className="max-w-4xl mx-auto relative">
          <Input 
            placeholder="Ask about spending, coverage..." 
            className="pr-12 py-6 bg-white shadow-sm border-primary/20 focus-visible:ring-primary"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button 
            size="icon" 
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-center mt-3 text-muted-foreground">
          FinChat AI utilizes your private data context. Analysis is based solely on your records.
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col h-svh overflow-hidden">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
          <ChatContent />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}
