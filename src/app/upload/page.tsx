
'use client';

import { useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/finchat/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileUp, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { categorizeExpenses } from '@/ai/flows/categorize-expense-flow';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc, query, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

  const documentsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'users', user.uid, 'documents'), orderBy('uploadDate', 'desc'));
  }, [db, user]);

  const { data: uploadedDocs, isLoading: loadingDocs } = useCollection(documentsQuery);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !db) return;

    setUploading(true);
    const docId = Math.random().toString(36).substring(7);
    const type = file.name.endsWith('.csv') ? 'csv' : 'pdf';

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        
        // 1. Create Document record
        const docRef = doc(db, 'users', user.uid, 'documents', docId);
        await setDoc(docRef, {
          id: docId,
          userId: user.uid,
          filename: file.name,
          fileType: type.toUpperCase(),
          uploadDate: new Date().toISOString(),
          status: 'processing'
        });

        // 2. Process chunks
        const chunks = content.split('\n\n').filter(Boolean);
        
        if (type === 'csv') {
          const lines = content.split('\n').slice(1).filter(l => l.trim());
          const descriptions = lines.map(line => line.split(',')[1]).filter(Boolean);
          
          let results: { description: string, category: string }[] = [];
          if (descriptions.length > 0) {
            const response = await categorizeExpenses({ descriptions });
            results = response.results;
          }

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const [date, desc, amountStr] = line.split(',');
            if (date && desc && amountStr) {
              const amount = parseFloat(amountStr);
              const categoryResult = results.find(r => r.description === desc);
              const chunkId = Math.random().toString(36).substring(7);
              
              const chunkRef = doc(db, 'users', user.uid, 'documents', docId, 'chunks', chunkId);
              await setDoc(chunkRef, {
                id: chunkId,
                documentId: docId,
                chunkText: line,
                chunkOrder: i,
                transactionDate: date,
                category: categoryResult?.category || 'Miscellaneous',
                amount: amount,
                embeddingVector: [0] // Mock embedding for vector search compatibility
              });
            }
          }
        } else {
          // PDF/Text processing
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

        // 3. Update status to ready
        await setDoc(docRef, { status: 'ready' }, { merge: true });
        
        toast({
          title: "File Processed Successfully",
          description: `${file.name} has been indexed for FinChat AI.`
        });
      };
      reader.readAsText(file);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "There was an error processing your document."
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between px-8 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <h2 className="text-lg font-semibold">Document Management</h2>
        </header>

        <main className="p-8 max-w-4xl mx-auto w-full space-y-8">
          <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <FileUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Upload Financial Documents</h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                Drag and drop your bank statements (CSV) or insurance/tax documents (PDF) to start analyzing.
              </p>
              <div className="flex items-center gap-4">
                <Button className="relative overflow-hidden" disabled={uploading}>
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileUp className="w-4 h-4 mr-2" />
                  )}
                  {uploading ? 'Processing...' : 'Browse Files'}
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleFileUpload}
                    accept=".csv,.pdf"
                  />
                </Button>
                <p className="text-xs text-muted-foreground">Supported: CSV, PDF (Max 10MB)</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Recent Documents</h4>
            {loadingDocs ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
              </div>
            ) : uploadedDocs?.length === 0 ? (
              <Card className="border-none shadow-sm">
                <CardContent className="flex flex-col items-center py-12 opacity-50">
                  <FileText className="w-12 h-12 mb-2" />
                  <p>No documents uploaded yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {uploadedDocs?.map((file) => (
                  <Card key={file.id} className="border-none shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-secondary p-2 rounded-lg">
                          {file.fileType === 'CSV' ? (
                            <FileSpreadsheet className="w-5 h-5 text-primary" />
                          ) : (
                            <FileText className="w-5 h-5 text-accent" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{file.filename}</p>
                          <p className="text-xs text-muted-foreground uppercase">{file.fileType}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.status === 'processing' && (
                          <span className="flex items-center gap-2 text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Indexing...
                          </span>
                        )}
                        {file.status === 'ready' && (
                          <span className="flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Ready
                          </span>
                        )}
                        {file.status === 'failed' && (
                          <span className="flex items-center gap-2 text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
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
