'use client';

import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Loader2, 
  PlusCircle,
  History,
  Trash2,
  MessageSquare,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  CheckCircle2,
  X
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { askFinancialQuestion } from '@/app/lib/actions';
import { cn } from '@/lib/utils';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  query, 
  orderBy 
} from 'firebase/firestore';
import type { ChatMessage, ChatSession } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const INITIAL_GREETING: ChatMessage = {
  role: 'assistant',
  content: "Namaste! I'm your FinChat Guardian Assistant. Ask me anything about your uploaded financial documents, bank statements, or overall spending patterns in Rupees (₹)."
};

const QUICK_PROMPTS = [
  "How much did I spend on Food this month?",
  "What is my highest expense category?",
  "How much could I potentially save every month?",
  "What happens if I reduce shopping by ₹1,000/mo?"
];

function formatSessionDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 2) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24 && d.getDate() === now.getDate()) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function ChatContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q');
  
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState<string>('New Conversation');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAutoSent, setHasAutoSent] = useState(false);

  // History panel & Dialog state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  
  // Delete confirmation modals
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [isDeleteCurrentDialogOpen, setIsDeleteCurrentDialogOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  // Real-time Chat Sessions Query from Firestore
  const sessionsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'users', user.uid, 'chatSessions'),
      orderBy('updatedAt', 'desc')
    );
  }, [db, user]);

  const { data: rawSessions, isLoading: loadingSessions } = useCollection(sessionsQuery);

  const chatSessions: ChatSession[] = useMemo(() => {
    if (!rawSessions) return [];
    return rawSessions as unknown as ChatSession[];
  }, [rawSessions]);

  const filteredSessions = useMemo(() => {
    if (!historySearch.trim()) return chatSessions;
    const term = historySearch.toLowerCase();
    return chatSessions.filter(s => 
      s.title?.toLowerCase().includes(term) || 
      s.preview?.toLowerCase().includes(term)
    );
  }, [chatSessions, historySearch]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-send query from URL (e.g. redirected from insight cards)
  useEffect(() => {
    if (mounted && initialQuery && !hasAutoSent && user && db && !isLoading) {
      setHasAutoSent(true);
      handleSend(initialQuery);
    }
  }, [mounted, initialQuery, user, db, hasAutoSent]);

  /**
   * Starts a brand new conversation session
   */
  const handleNewSession = () => {
    setCurrentSessionId(null);
    setCurrentTitle('New Conversation');
    setMessages([INITIAL_GREETING]);
    setInput('');
    setIsMobileSheetOpen(false);
  };

  /**
   * Loads an existing conversation from history
   */
  const handleSelectSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setCurrentTitle(session.title || 'Conversation');
    setMessages(session.messages && session.messages.length > 0 ? session.messages : [INITIAL_GREETING]);
    setIsMobileSheetOpen(false);
  };

  /**
   * Deletes a specific session from Firestore
   */
  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete || !user || !db) return;
    const targetId = sessionToDelete.id;
    const targetTitle = sessionToDelete.title;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'chatSessions', targetId));
      
      // If the currently active chat is being deleted, reset to new session
      if (currentSessionId === targetId) {
        handleNewSession();
      }

      toast({
        title: "Chat Deleted",
        description: `"${targetTitle}" has been removed.`
      });
    } catch (err) {
      console.error("Error deleting session:", err);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Could not delete chat session. Please try again."
      });
    } finally {
      setSessionToDelete(null);
    }
  };

  /**
   * Deletes the active chat conversation
   */
  const handleConfirmDeleteCurrent = async () => {
    if (!user || !db) return;

    if (currentSessionId) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'chatSessions', currentSessionId));
        toast({
          title: "Conversation Cleared",
          description: "This conversation has been permanently removed."
        });
      } catch (err) {
        console.error("Error deleting active session:", err);
      }
    }

    handleNewSession();
    setIsDeleteCurrentDialogOpen(false);
  };

  /**
   * Clears all chat history for the user
   */
  const handleConfirmClearAll = async () => {
    if (!user || !db || chatSessions.length === 0) return;

    try {
      const batch = writeBatch(db);
      chatSessions.forEach(s => {
        const ref = doc(db, 'users', user.uid, 'chatSessions', s.id);
        batch.delete(ref);
      });

      await batch.commit();
      handleNewSession();
      
      toast({
        title: "All History Cleared",
        description: "All past conversations have been permanently removed."
      });
    } catch (err) {
      console.error("Error clearing all history:", err);
      toast({
        variant: "destructive",
        title: "Clear Failed",
        description: "Could not clear history. Please try again."
      });
    } finally {
      setIsClearAllDialogOpen(false);
      setIsMobileSheetOpen(false);
    }
  };

  /**
   * Sends user message, requests answer from AI, and persists session to Firestore
   */
  const handleSend = async (overrideText?: string) => {
    const msgToSend = (overrideText || input).trim();
    if (!msgToSend || isLoading) return;

    if (!overrideText) {
      setInput('');
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: msgToSend,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      if (!user || !db) {
        throw new Error("Secure session initializing... Please try again in a moment.");
      }

      // Generate or reuse session ID
      let sessionId = currentSessionId;
      let sessionTitle = currentTitle;

      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 10);
        sessionTitle = msgToSend.length > 38 ? `${msgToSend.slice(0, 35)}...` : msgToSend;
        setCurrentSessionId(sessionId);
        setCurrentTitle(sessionTitle);

        // Create initial session document in Firestore
        const sessionRef = doc(db, 'users', user.uid, 'chatSessions', sessionId);
        await setDoc(sessionRef, {
          id: sessionId,
          userId: user.uid,
          title: sessionTitle,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          preview: msgToSend.slice(0, 70),
          messages: updatedMessages
        });
      }

      // Fetch user's indexed chunks from Firestore in parallel
      const docsRef = collection(db, 'users', user.uid, 'documents');
      const docsSnap = await getDocs(docsRef);
      const validDocSnaps = docsSnap.docs.filter(d => !d.id.startsWith('settings_'));

      const chunkSnaps = await Promise.all(
        validDocSnaps.map(d => getDocs(collection(db, 'users', user.uid, 'documents', d.id, 'chunks')))
      );

      const relevantChunks: any[] = [];
      validDocSnaps.forEach((docSnap, index) => {
        const snap = chunkSnaps[index];
        const filename = docSnap.data().filename || 'Statement';
        snap.forEach(chunkDoc => {
          const cData = chunkDoc.data();
          const amt = (cData.amount !== undefined && cData.amount !== null && !isNaN(Number(cData.amount))) 
            ? Number(cData.amount) 
            : undefined;

          relevantChunks.push({
            text: (cData.chunkText || '').trim() || 'Financial transaction record',
            metadata: {
              date: cData.transactionDate || new Date().toISOString().split('T')[0],
              category: cData.category || undefined,
              amount: amt,
              fileName: filename
            }
          });
        });
      });

      // Fetch Grow My Money settings to provide planner context
      let plannerContext: any = undefined;
      try {
        const settingsSnap = await getDoc(doc(db, 'users', user.uid, 'documents', 'settings_grow_my_money'));
        if (settingsSnap.exists()) {
          const sData = settingsSnap.data();
          plannerContext = {
            monthlyIncome: typeof sData.monthlyIncome === 'number' ? sData.monthlyIncome : undefined,
            acceptedTargets: sData.acceptedTargets || undefined,
            goals: Array.isArray(sData.goals) ? sData.goals.map((g: any) => ({
              name: String(g.name || 'Goal'),
              targetAmount: Number(g.targetAmount) || 0,
              currentSaved: Number(g.currentSaved) || 0,
              targetDate: String(g.targetDate || new Date().toISOString().split('T')[0]),
            })) : undefined,
          };
        }
      } catch (pErr) {
        console.warn('Could not load planner context for chat:', pErr);
      }

      const clampedChunks = relevantChunks.slice(0, 45);
      const response = await askFinancialQuestion(msgToSend, clampedChunks, plannerContext);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);

      // Persist conversation update to Firestore
      if (sessionId) {
        const sessionRef = doc(db, 'users', user.uid, 'chatSessions', sessionId);
        await setDoc(sessionRef, {
          userId: user.uid,
          messages: finalMessages,
          updatedAt: new Date().toISOString(),
          preview: response.answer.slice(0, 80)
        }, { merge: true });
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error?.message || "An unexpected error occurred while processing your request. Please try again."}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reusable History List Component
   */
  const renderHistoryContent = () => (
    <div className="flex flex-col h-full text-slate-800">
      {/* Search Header */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/80 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
            <History className="w-4 h-4 text-blue-600" />
            <span>Chat History</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200">
              {chatSessions.length}
            </Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11px] font-semibold gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 rounded-lg"
            onClick={handleNewSession}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </Button>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search past questions..."
            className="h-8 pl-8 pr-7 text-xs rounded-xl bg-white border-slate-200 focus-visible:ring-blue-500"
          />
          {historySearch && (
            <button
              onClick={() => setHistorySearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loadingSessions ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-xs">Loading history...</span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 px-4 text-center">
            <MessageSquare className="w-8 h-8 text-slate-300 mb-2 stroke-1" />
            <p className="text-xs font-semibold text-slate-600">
              {historySearch ? 'No matching chats found' : 'No chat history yet'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[180px]">
              {historySearch ? 'Try a different search term.' : 'Your conversations with Finchat Mentor will be saved here.'}
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === currentSessionId;
            return (
              <div
                key={session.id}
                className={cn(
                  "group relative flex items-start gap-2.5 p-2.5 rounded-2xl cursor-pointer transition-all border text-left",
                  isActive
                    ? "bg-blue-50/90 border-blue-200 shadow-2xs"
                    : "hover:bg-slate-50/80 border-transparent hover:border-slate-100"
                )}
                onClick={() => handleSelectSession(session)}
              >
                <div className={cn(
                  "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                  isActive ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                )}>
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                
                <div className="flex-1 min-w-0 pr-6">
                  <p className={cn(
                    "text-xs font-semibold truncate",
                    isActive ? "text-blue-900" : "text-slate-700"
                  )}>
                    {session.title || 'Conversation'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5 leading-tight">
                    {session.preview || `${session.messages?.length || 0} messages`}
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium block mt-1">
                    {formatSessionDate(session.updatedAt || session.createdAt)}
                  </span>
                </div>

                {/* Delete button for individual session */}
                <button
                  type="button"
                  title="Delete conversation"
                  className={cn(
                    "absolute right-2 top-2.5 p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-70 group-hover:opacity-100",
                    isActive && "text-slate-500"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSessionToDelete({ id: session.id, title: session.title || 'Conversation' });
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* History Footer Actions */}
      {chatSessions.length > 0 && (
        <div className="p-2 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-8 text-[11px] font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 gap-1.5 justify-center rounded-xl"
            onClick={() => setIsClearAllDialogOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All History</span>
          </Button>
        </div>
      )}
    </div>
  );

  if (!mounted) return null;

  const hasMessages = messages.length > 1;

  return (
    <div className="max-w-6xl mx-auto w-full px-2.5 sm:px-6 pb-3 sm:pb-6 flex-1 flex flex-col h-[calc(100dvh-7.5rem)] sm:h-[calc(100dvh-8.5rem)]">
      <div className="flex-1 flex glass-card border border-slate-200/90 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_16px_36px_-4px_rgba(0,0,0,0.25),0_8px_16px_-2px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.10)] bg-white/95">
        
        {/* Desktop Collapsible History Sidebar */}
        <aside
          className={cn(
            "hidden md:flex flex-col border-r border-slate-100 bg-slate-50/30 transition-all duration-300 ease-in-out shrink-0 overflow-hidden",
            isHistoryOpen ? "w-80" : "w-0 border-r-0"
          )}
        >
          <div className="w-80 h-full flex flex-col">
            {renderHistoryContent()}
          </div>
        </aside>

        {/* Main Chat Interface */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          
          {/* Header Bar */}
          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between border-b border-slate-100 bg-slate-50/70 shrink-0 gap-2">
            
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* History Toggle Button (Desktop) */}
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs",
                  isHistoryOpen && "bg-blue-50 border-blue-200 text-blue-700"
                )}
                onClick={() => setIsHistoryOpen(prev => !prev)}
                title={isHistoryOpen ? "Collapse history panel" : "Show chat history"}
              >
                {isHistoryOpen ? (
                  <PanelLeftClose className="w-3.5 h-3.5" />
                ) : (
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                )}
                <span>History</span>
                {chatSessions.length > 0 && (
                  <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 h-4 text-[10px] bg-slate-100 text-slate-700">
                    {chatSessions.length}
                  </Badge>
                )}
              </Button>

              {/* History Toggle Button (Mobile Sheet Trigger) */}
              <Button
                variant="outline"
                size="sm"
                className="md:hidden inline-flex items-center gap-1 h-8 px-2 sm:px-2.5 rounded-full text-xs font-semibold border-slate-200 bg-white"
                onClick={() => setIsMobileSheetOpen(true)}
              >
                <History className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden xs:inline">History</span>
                {chatSessions.length > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[10px]">
                    {chatSessions.length}
                  </Badge>
                )}
              </Button>

              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    {currentSessionId ? currentTitle : "Finchat Mentor"}
                  </h2>
                  <span className="hidden lg:inline-flex items-center text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full whitespace-nowrap">
                    Guardian Active • INR (₹)
                  </span>
                </div>
              </div>
            </div>

            {/* Top Right Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Delete / Clear Active Chat Button */}
              {hasMessages && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-slate-200 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 shadow-2xs text-xs font-semibold rounded-full px-2 sm:px-2.5 transition-colors"
                  onClick={() => setIsDeleteCurrentDialogOpen(true)}
                  title="Clear conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete Chat</span>
                </Button>
              )}

              {/* New Session Button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-1.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs text-xs font-semibold rounded-full px-2 sm:px-2.5" 
                onClick={handleNewSession}
                title="Start a new chat session"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden xs:inline">New Session</span>
              </Button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.map((message, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 text-sm",
                  message.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                  message.role === 'user' 
                    ? "bg-slate-900 text-white" 
                    : "bg-gradient-to-tr from-blue-600 to-sky-500 text-white shadow-blue-500/20 shadow-md"
                )}>
                  {message.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className="flex flex-col max-w-[85%]">
                  <div
                    className={cn(
                      "p-4 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm text-sm",
                      message.role === 'user'
                        ? "bg-gradient-to-r from-blue-600 to-sky-600 text-white font-medium rounded-tr-none shadow-blue-500/10"
                        : "bg-slate-50/90 border border-slate-200/80 text-slate-800 rounded-tl-none font-sans"
                    )}
                  >
                    {message.content}
                  </div>
                  {message.timestamp && (
                    <span className={cn(
                      "text-[10px] text-slate-400 mt-1 px-1",
                      message.role === 'user' ? "text-right" : "text-left"
                    )}>
                      {formatSessionDate(message.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 rounded-tl-none flex items-center gap-2 text-slate-600 text-xs font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Finchat is scrutinizing financial entries...</span>
                </div>
              </div>
            )}

            {/* Quick Prompts when starting a new conversation */}
            {messages.length === 1 && (
              <div className="pt-4 pb-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  Suggested Financial Queries
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(prompt)}
                      className="text-left text-xs p-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-blue-50 hover:border-blue-200 text-slate-700 transition-all font-medium flex items-center justify-between group"
                    >
                      <span className="truncate pr-2">{prompt}</span>
                      <Send className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Chat Input Form */}
          <div className="p-2.5 sm:p-4 border-t border-slate-100 bg-white shrink-0">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }} 
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about spending, monthly savings, or budget guardrails..."
                className="flex-1 rounded-full border-slate-200 focus-visible:ring-blue-500 bg-slate-50/50 px-3.5 sm:px-4 text-xs sm:text-sm h-10 sm:h-11"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="rounded-full px-3.5 sm:px-5 h-10 sm:h-11 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-semibold shadow-md shadow-blue-500/20 transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile History Slide-Over Sheet */}
      <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
        <SheetContent side="left" className="p-0 w-80 sm:w-80">
          <SheetHeader className="sr-only">
            <SheetTitle>Chat History</SheetTitle>
          </SheetHeader>
          {renderHistoryContent()}
        </SheetContent>
      </Sheet>

      {/* Delete Single Session Confirmation Dialog */}
      <AlertDialog open={Boolean(sessionToDelete)} onOpenChange={(open) => !open && setSessionToDelete(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Are you sure you want to delete <span className="font-semibold text-slate-700">"{sessionToDelete?.title}"</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="text-xs rounded-xl h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDeleteSession} 
              className="text-xs rounded-xl h-9 bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Current Active Chat Confirmation Dialog */}
      <AlertDialog open={isDeleteCurrentDialogOpen} onOpenChange={setIsDeleteCurrentDialogOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">Delete Current Chat?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              This will clear the current conversation and delete it from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="text-xs rounded-xl h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDeleteCurrent} 
              className="text-xs rounded-xl h-9 bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Delete Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All History Confirmation Dialog */}
      <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">Clear All Chat History?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Are you sure you want to permanently delete all {chatSessions.length} conversations? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="text-xs rounded-xl h-9">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmClearAll} 
              className="text-xs rounded-xl h-9 bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center flex-1 h-[calc(100vh-8.5rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
