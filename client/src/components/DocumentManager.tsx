import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Calendar, FileCheck, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  lastModified: Date;
  wordCount: number;
}

interface DocumentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDocument: (document: Document) => void;
}

export function DocumentManager({ isOpen, onClose, onLoadDocument }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredDocuments(documents);
    } else {
      const filtered = documents.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDocuments(filtered);
    }
  }, [documents, searchQuery]);

  const loadDocuments = () => {
    const saved = localStorage.getItem('savedDocuments');
    if (saved) {
      const docs = JSON.parse(saved).map((doc: any) => ({
        ...doc,
        createdAt: new Date(doc.createdAt),
        lastModified: new Date(doc.lastModified)
      }));
      setDocuments(docs);
    }
  };

  const deleteDocument = (id: string) => {
    const updatedDocs = documents.filter(doc => doc.id !== id);
    setDocuments(updatedDocs);
    localStorage.setItem('savedDocuments', JSON.stringify(updatedDocs));
    
    toast({
      title: "Documento excluído",
      description: "O documento foi removido permanentemente.",
    });
  };

  const handleLoadDocument = (document: Document) => {
    onLoadDocument(document);
    onClose();
    
    toast({
      title: "Documento carregado",
      description: `"${document.title}" foi carregado no editor.`,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Lista de Documentos ({filteredDocuments.length})
          </DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Pesquisar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 h-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="h-96">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              {documents.length === 0 ? (
                <>
                  <p>Nenhum documento salvo ainda.</p>
                  <p className="text-sm">Comece escrevendo e seus documentos aparecerão aqui.</p>
                </>
              ) : (
                <>
                  <p>Nenhum documento encontrado.</p>
                  <p className="text-sm">Tente pesquisar com outras palavras-chave.</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold truncate flex-1 mr-2">
                      {doc.title}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleLoadDocument(doc)}
                        className="text-xs"
                      >
                        <FileCheck className="w-3 h-3 mr-1" />
                        Carregar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteDocument(doc.id)}
                        className="text-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {doc.content.substring(0, 150)}
                    {doc.content.length > 150 && '...'}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(doc.lastModified)}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {doc.wordCount} palavras
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <Separator />
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function saveDocument(content: string, title?: string): Document {
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const autoTitle = title || generateAutoTitle(content);
  
  const document: Document = {
    id: Date.now().toString(),
    title: autoTitle,
    content,
    createdAt: new Date(),
    lastModified: new Date(),
    wordCount
  };

  const existingDocs = JSON.parse(localStorage.getItem('savedDocuments') || '[]');
  const updatedDocs = [...existingDocs, document];
  localStorage.setItem('savedDocuments', JSON.stringify(updatedDocs));

  return document;
}

function generateAutoTitle(content: string): string {
  if (!content.trim()) return 'Documento sem título';
  
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length > 0) {
    return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
  }
  
  const firstWords = content.trim().split(/\s+/).slice(0, 8).join(' ');
  return firstWords.length > 50 ? firstWords.substring(0, 47) + '...' : firstWords;
}