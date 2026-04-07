'use client';

import { useState, useRef, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/finchat/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  FileText, 
  ExternalLink,
  PlusCircle,
  MessageSquare
} from 'lucide-react';
import { askFinancialQuestion } from '@/app/lib/actions';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { text: string; fileName: string; date?: string }[];
}

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: "Hello! I'm your FinChat Assistant. Ask me anything about your uploaded financial documents, bank statements, or overall spending patterns." 
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await askFinancialQuestion(userMsg);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.answer, 
        sources: response.sources 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I encountered an error while analyzing your data. Please ensure you've uploaded some documents first." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col h-svh overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between px-8 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Financial Chat</h2>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <PlusCircle className="w-4 h-4" />
            New Analysis
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6" ref={scrollRef}>
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={cn(
                "flex gap-4 max-w-4xl mx-auto",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                msg.role === 'user' ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
              )}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              
              <div className={cn(
                "space-y-4",
                msg.role === 'user' ? "items-end text-right" : "items-start"
              )}>
                <Card className={cn(
                  "border-none shadow-sm inline-block max-w-[85%]",
                  msg.role === 'user' ? "bg-white text-foreground" : "bg-primary/5 text-foreground"
                )}>
                  <CardContent className="p-4 leading-relaxed text-sm">
                    {msg.content}
                  </CardContent>
                </Card>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest pl-2">Evidence & Sources</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((source, si) => (
                        <div key={si} className="bg-white border rounded-lg p-2 text-[11px] flex items-center gap-2 group hover:border-primary transition-colors cursor-default max-w-[200px]">
                          <FileText className="w-3 h-3 text-primary shrink-0" />
                          <span className="truncate">{source.fileName}</span>
                          <span className="text-[9px] text-muted-foreground ml-auto">{source.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 max-w-4xl mx-auto">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-primary/5 rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Analyzing documents and generating insights...</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 md:p-8 bg-white/50 backdrop-blur-md border-t">
          <div className="max-w-4xl mx-auto relative">
            <Input 
              placeholder="Ask about your spending, insurance coverage, or tax liability..." 
              className="pr-12 py-6 bg-white shadow-sm border-primary/20 focus-visible:ring-primary"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button 
              size="icon" 
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-center mt-3 text-muted-foreground">
            FinChat AI utilizes your private data context. Analysis is based solely on your uploaded documents.
          </p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}