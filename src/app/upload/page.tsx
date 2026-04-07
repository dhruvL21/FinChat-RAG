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
import { processFile } from '@/app/lib/actions';
import { useToast } from '@/hooks/use-toast';

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<{ name: string; type: string; status: string }[]>([]);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const newFile = { name: file.name, type: file.type, status: 'processing' };
    setFiles(prev => [...prev, newFile]);

    try {
      // Mock parsing the file content
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        const type = file.name.endsWith('.csv') ? 'csv' : 'pdf';
        await processFile(content, file.name, type);
        
        setFiles(prev => prev.map(f => 
          f.name === file.name ? { ...f, status: 'completed' } : f
        ));
        
        toast({
          title: "File Processed Successfully",
          description: `${file.name} has been indexed for FinChat AI.`
        });
      };
      reader.readAsText(file);
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.name === file.name ? { ...f, status: 'error' } : f
      ));
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
            {files.length === 0 ? (
              <Card className="border-none shadow-sm">
                <CardContent className="flex flex-col items-center py-12 opacity-50">
                  <FileText className="w-12 h-12 mb-2" />
                  <p>No documents uploaded yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {files.map((file, i) => (
                  <Card key={i} className="border-none shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-secondary p-2 rounded-lg">
                          {file.name.endsWith('.csv') ? (
                            <FileSpreadsheet className="w-5 h-5 text-primary" />
                          ) : (
                            <FileText className="w-5 h-5 text-accent" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground uppercase">{file.type || 'Document'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.status === 'processing' && (
                          <span className="flex items-center gap-2 text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Indexing...
                          </span>
                        )}
                        {file.status === 'completed' && (
                          <span className="flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Ready
                          </span>
                        )}
                        {file.status === 'error' && (
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