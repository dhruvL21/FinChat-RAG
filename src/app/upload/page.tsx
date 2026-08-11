'use client';

import { useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/finchat/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  FileUp, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Trash2,
  Zap
} from 'lucide-react';
import { categorizeExpenses } from '@/ai/flows/categorize-expense-flow';
import { mapCSVSchema, type CSVSchemaMapping } from '@/ai/flows/map-csv-schema-flow';
import { hashDocumentContent, getCachedDocument, setCachedDocument } from '@/lib/redis';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc, deleteDoc, getDocs, writeBatch, query, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { parseCSVLine } from '@/lib/utils';

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [lastMapping, setLastMapping] = useState<CSVSchemaMapping | null>(null);
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

  const documentsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'documents'), orderBy('uploadDate', 'desc'));
  }, [db, user]);

  const { data: uploadedDocs, isLoading: loadingDocs } = useCollection(documentsQuery);

  const handleDeleteDocument = async (docId: string, filename: string) => {
    if (!user || !db) return;
    try {
      // 1. Fetch chunks subcollection BEFORE deleting parent document
      const chunksRef = collection(db, 'users', user.uid, 'documents', docId, 'chunks');
      const chunksSnapshot = await getDocs(chunksRef);

      const batch = writeBatch(db);

      // 2. Add each chunk to batch delete
      chunksSnapshot.docs.forEach(chunkDoc => {
        batch.delete(chunkDoc.ref);
      });

      // 3. Add parent document to batch delete
      const docRef = doc(db, 'users', user.uid, 'documents', docId);
      batch.delete(docRef);

      // 4. Commit atomic batch delete
      await batch.commit();

      toast({
        title: "Document & Data Deleted",
        description: `All records and data for "${filename}" have been permanently removed.`
      });
    } catch (error) {
      console.error("Error deleting document and data:", error);
      toast({
        variant: "destructive",
        title: "Failed to Delete Document Data",
        description: "An error occurred while removing the document data."
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !db) return;

    setUploading(true);
    setProcessingStatus('Initializing document upload...');
    const docId = Math.random().toString(36).substring(7);
    const type = file.name.endsWith('.csv') ? 'csv' : 'pdf';

    try {
      const docRef = doc(db, 'users', user.uid, 'documents', docId);
      await setDoc(docRef, {
        id: docId,
        userId: user.uid,
        filename: file.name,
        fileType: type.toUpperCase(),
        uploadDate: new Date().toISOString(),
        status: 'processing'
      });

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const chunks = content.split('\n\n').filter(Boolean);
          
          if (type === 'csv') {
            const rawLines = content.split('\n').filter(l => l.trim());
            const headerLine = rawLines[0];
            const headers = headerLine ? headerLine.split(',') : [];
            const dataLines = rawLines.slice(1);

            // 1. Check Redis cache for duplicate document fingerprint
            setProcessingStatus('⚡ Step 1/3: Checking Redis cache for document fingerprint...');
            const contentHash = await hashDocumentContent(file.name + content);
            const cachedDoc = await getCachedDocument(contentHash);

            if (cachedDoc) {
              setProcessingStatus('⚡ Redis Cache Hit! Instantly importing mapped schema & transactions...');
              setLastMapping({
                ...cachedDoc.schemaMapping,
                explanation: `⚡ [Redis Cache Hit] ${cachedDoc.schemaMapping.explanation}`
              });

              for (let i = 0; i < cachedDoc.transactions.length; i++) {
                const tx = cachedDoc.transactions[i];
                const chunkId = Math.random().toString(36).substring(7);
                const chunkRef = doc(db, 'users', user.uid, 'documents', docId, 'chunks', chunkId);
                await setDoc(chunkRef, {
                  id: chunkId,
                  documentId: docId,
                  chunkText: `${tx.date},${tx.description},${tx.amount},${tx.category}`,
                  chunkOrder: i,
                  transactionDate: tx.date,
                  category: tx.category,
                  amount: tx.amount,
                  embeddingVector: [0]
                });
              }

              await setDoc(docRef, { status: 'ready' }, { merge: true });
              toast({
                title: "⚡ Instant Redis Cache Hit",
                description: `Retrieved schema mapping & transactions for "${file.name}" instantly from Redis cache.`
              });
              return;
            }

            setProcessingStatus('🔍 Step 1/3: OpenAI analyzing CSV structure & mapping column features...');
            const mapping = await mapCSVSchema({ 
              sampleLines: rawLines.slice(0, 6), 
              filename: file.name 
            });
            setLastMapping(mapping);

            const parsedTransactions = dataLines.map(line => {
              const fallback = parseCSVLine(line, headers);
              const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
              
              const rawDate = mapping.dateColumnIndex >= 0 ? parts[mapping.dateColumnIndex] : '';
              const rawDesc = mapping.descriptionColumnIndex >= 0 ? parts[mapping.descriptionColumnIndex] : '';
              const rawAmtStr = mapping.amountColumnIndex >= 0 ? parts[mapping.amountColumnIndex] : '';
              const rawCat = mapping.categoryColumnIndex >= 0 ? parts[mapping.categoryColumnIndex] : '';

              const parsedAmt = rawAmtStr ? parseFloat(rawAmtStr.replace(/[^0-9.-]/g, '')) : NaN;
              
              return {
                date: (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(rawDate) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(rawDate)) ? rawDate : fallback.date,
                description: (rawDesc && !rawDesc.startsWith('TXN-') && !/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(rawDesc)) ? rawDesc : fallback.description,
                amount: (!isNaN(parsedAmt) && parsedAmt > 0) ? Math.abs(parsedAmt) : fallback.amount,
                category: rawCat || fallback.category
              };
            });

            setProcessingStatus('🧠 Step 2/3: OpenAI categorizing transactions...');
            const descriptions = parsedTransactions.map(t => t.description).filter(Boolean);
            
            let results: { description: string, category: string }[] = [];
            if (descriptions.length > 0) {
              try {
                const response = await categorizeExpenses({ descriptions });
                results = response?.results || [];
              } catch (catErr) {
                console.error("Expense categorization failed, using default categories:", catErr);
              }
            }

            const finalTransactionsToCache: Array<{ date: string; description: string; amount: number; category: string }> = [];

            setProcessingStatus('⚡ Step 3/3: Indexing mapped records into database & caching in Redis...');
            for (let i = 0; i < parsedTransactions.length; i++) {
              const tx = parsedTransactions[i];
              const categoryResult = results.find(r => r.description === tx.description);
              const finalCategory = (tx.category && tx.category !== 'Miscellaneous') ? tx.category : (categoryResult?.category || 'Miscellaneous');
              const chunkId = Math.random().toString(36).substring(7);
              
              finalTransactionsToCache.push({
                date: tx.date,
                description: tx.description,
                amount: tx.amount,
                category: finalCategory
              });

              const chunkRef = doc(db, 'users', user.uid, 'documents', docId, 'chunks', chunkId);
              await setDoc(chunkRef, {
                id: chunkId,
                documentId: docId,
                chunkText: dataLines[i],
                chunkOrder: i,
                transactionDate: tx.date,
                category: finalCategory,
                amount: tx.amount,
                embeddingVector: [0]
              });
            }

            // Save document processing result in Redis cache
            await setCachedDocument({
              hash: contentHash,
              filename: file.name,
              schemaMapping: mapping,
              transactions: finalTransactionsToCache,
              cachedAt: new Date().toISOString()
            });
          } else {
            setProcessingStatus('⚡ Processing & indexing document chunks...');
            for (let i = 0; i < chunks.length; i++) {
              const chunkId = Math.random().toString(36).substring(7);
              const chunkRef = doc(db, 'users', user.uid, 'documents', docId, 'chunks', chunkId);
              await setDoc(chunkRef, {
                id: chunkId,
                documentId: docId,
                chunkText: chunks[i],
                chunkOrder: i,
                embeddingVector: [0]
              });
            }
          }

          await setDoc(docRef, { status: 'ready' }, { merge: true });
          
          toast({
            title: "File Mapped & Processed",
            description: `${file.name} feature fields mapped by OpenAI and indexed into your app.`
          });
        } catch (procErr) {
          console.error("Error processing document content:", procErr);
          await setDoc(docRef, { status: 'failed' }, { merge: true });
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: "There was an error mapping your document."
          });
        } finally {
          setUploading(false);
          setProcessingStatus('');
        }
      };

      reader.onerror = async (err) => {
        console.error("FileReader error:", err);
        await setDoc(docRef, { status: 'failed' }, { merge: true });
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "Failed to read the file."
        });
        setUploading(false);
      };

      reader.readAsText(file);
    } catch (error) {
      console.error("Error creating document record:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "There was an error initializing the upload."
      });
      setUploading(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between px-4 md:px-8 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10 gap-2">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h2 className="text-lg font-semibold truncate">Documents</h2>
          </div>
        </header>

        <main className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-8">
          <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <FileUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1 text-center">Upload Financial Documents</h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm px-4">
                Drag and drop your bank statements (CSV) or insurance/tax documents (PDF).
              </p>
              <div className="flex flex-col items-center gap-4 w-full">
                <Button className="relative overflow-hidden w-full sm:w-auto" disabled={uploading}>
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                  ) : (
                    <FileUp className="w-4 h-4 mr-2" />
                  )}
                  {uploading ? 'Processing Document...' : 'Browse Files'}
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleFileUpload}
                    accept=".csv,.pdf"
                    disabled={uploading}
                  />
                </Button>
                
                {uploading && processingStatus && (
                  <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl flex items-center gap-3 animate-pulse text-xs font-semibold text-primary max-w-md w-full justify-center">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>{processingStatus}</span>
                  </div>
                )}
                
                <p className="text-[10px] text-muted-foreground">Supported: CSV, PDF (Max 10MB)</p>
              </div>
            </CardContent>
          </Card>

          {lastMapping && (
            <Card className="border-none bg-gradient-to-r from-primary/10 via-purple-50 to-primary/5 shadow-sm">
              <CardContent className="p-4 md:p-6 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  {lastMapping.explanation.includes('Redis Cache Hit') ? (
                    <>
                      <Zap className="w-4 h-4 text-amber-500 fill-amber-500 animate-bounce" />
                      <span className="text-amber-700">⚡ Redis Cache Hit — Instant Document Import</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-accent animate-spin" />
                      <span>OpenAI Feature Schema Mapping Applied</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {lastMapping.explanation}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="bg-white/80 border border-primary/20 text-[10px] font-bold px-2.5 py-1 rounded-md text-foreground">
                    📅 Date: Col #{lastMapping.dateColumnIndex + 1}
                  </span>
                  <span className="bg-white/80 border border-primary/20 text-[10px] font-bold px-2.5 py-1 rounded-md text-foreground">
                    📝 Description: Col #{lastMapping.descriptionColumnIndex + 1}
                  </span>
                  <span className="bg-white/80 border border-primary/20 text-[10px] font-bold px-2.5 py-1 rounded-md text-foreground">
                    💰 Amount: Col #{lastMapping.amountColumnIndex + 1}
                  </span>
                  {lastMapping.categoryColumnIndex >= 0 && (
                    <span className="bg-white/80 border border-primary/20 text-[10px] font-bold px-2.5 py-1 rounded-md text-foreground">
                      🏷️ Category: Col #{lastMapping.categoryColumnIndex + 1}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Recent Documents</h4>
            {loadingDocs ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
              </div>
            ) : uploadedDocs?.length === 0 ? (
              <Card className="border-none shadow-sm">
                <CardContent className="flex flex-col items-center py-12 opacity-50">
                  <FileText className="w-12 h-12 mb-2" />
                  <p className="text-sm">No documents uploaded yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {uploadedDocs?.map((file) => (
                  <Card key={file.id} className="border-none shadow-sm">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-secondary p-2 rounded-lg shrink-0">
                          {file.fileType === 'CSV' ? (
                            <FileSpreadsheet className="w-5 h-5 text-primary" />
                          ) : (
                            <FileText className="w-5 h-5 text-accent" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.filename}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{file.fileType}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 self-end sm:self-auto">
                        {file.status === 'processing' && (
                          <span className="flex items-center gap-2 text-[10px] md:text-xs text-primary font-medium bg-primary/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Indexing...
                          </span>
                        )}
                        {file.status === 'ready' && (
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-[10px] md:text-xs text-green-600 font-bold bg-green-50 border border-green-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Ready
                            </span>
                            <Link href="/">
                              <Button size="sm" variant="default" className="text-[10px] md:text-xs font-bold gap-1 py-1 h-7 bg-primary hover:bg-primary/90 text-white shadow-xs">
                                View Overview
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            </Link>
                          </div>
                        )}
                        {file.status === 'failed' && (
                          <span className="flex items-center gap-2 text-[10px] md:text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded-full whitespace-nowrap">
                            <AlertCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}

                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                          onClick={() => handleDeleteDocument(file.id, file.filename)}
                          title="Remove document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}