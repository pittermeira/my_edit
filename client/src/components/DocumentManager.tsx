import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Trash2, Calendar, FileCheck, Search, X, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { downloadTextFile, downloadPDFFile, generateFilename } from "@/utils/fileExport";

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  lastModified: Date;
  wordCount: number;
  characterCount: number;
  isDeleted?: boolean;
  deletedAt?: Date;
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
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDownloadFormat, setBulkDownloadFormat] = useState<'txt' | 'pdf' | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [documentToRestore, setDocumentToRestore] = useState<string | null>(null);
  const [documentToPermanentDelete, setDocumentToPermanentDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    const activeDocuments = showTrash 
      ? documents.filter(doc => doc.isDeleted) 
      : documents.filter(doc => !doc.isDeleted);

    if (searchQuery.trim() === "") {
      setFilteredDocuments(activeDocuments);
    } else {
      const filtered = activeDocuments.filter(doc => 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDocuments(filtered);
    }
  }, [documents, searchQuery, showTrash]);

  const loadDocuments = () => {
    const saved = localStorage.getItem('savedDocuments');
    if (saved) {
      const docs = JSON.parse(saved).map((doc: any) => ({
        ...doc,
        createdAt: new Date(doc.createdAt),
        lastModified: new Date(doc.lastModified),
        characterCount: doc.characterCount || doc.content.length
      }));
      setDocuments(docs);
    }
  };

  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'savedDocuments') {
        loadDocuments();
      }
    };

    const handleCustomStorageEvent = () => {
      loadDocuments();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('documentsUpdated', handleCustomStorageEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('documentsUpdated', handleCustomStorageEvent);
    };
  }, []);

  const confirmDeleteDocument = (id: string) => {
    setDocumentToDelete(id);
  };

  const deleteDocument = () => {
    if (!documentToDelete) return;

    const updatedDocs = documents.map(doc => 
      doc.id === documentToDelete 
        ? { ...doc, isDeleted: true, deletedAt: new Date() }
        : doc
    );
    setDocuments(updatedDocs);
    localStorage.setItem('savedDocuments', JSON.stringify(updatedDocs));
    setDocumentToDelete(null);

    toast({
      title: "Documento movido para lixeira",
      description: "O documento pode ser restaurado na lixeira.",
    });
  };

  const restoreDocument = () => {
    if (!documentToRestore) return;

    const updatedDocs = documents.map(doc => 
      doc.id === documentToRestore 
        ? { ...doc, isDeleted: false, deletedAt: undefined }
        : doc
    );
    setDocuments(updatedDocs);
    localStorage.setItem('savedDocuments', JSON.stringify(updatedDocs));
    setDocumentToRestore(null);

    toast({
      title: "Documento restaurado",
      description: "O documento foi restaurado com sucesso.",
    });
  };

  const permanentDeleteDocument = () => {
    if (!documentToPermanentDelete) return;

    const updatedDocs = documents.filter(doc => doc.id !== documentToPermanentDelete);
    setDocuments(updatedDocs);
    localStorage.setItem('savedDocuments', JSON.stringify(updatedDocs));
    setDocumentToPermanentDelete(null);

    toast({
      title: "Documento excluído permanentemente",
      description: "O documento foi removido definitivamente.",
    });
  };

  const handleBulkDelete = () => {
    if (showTrash) {
      // Se estamos na lixeira, excluir permanentemente
      const updatedDocs = documents.filter(doc => !selectedDocuments.has(doc.id));
      setDocuments(updatedDocs);
      localStorage.setItem('savedDocuments', JSON.stringify(updatedDocs));
      setSelectedDocuments(new Set());
      setShowBulkDeleteConfirm(false);

      toast({
        title: `${selectedDocuments.size} documento(s) excluído(s) permanentemente`,
        description: "Os documentos foram removidos definitivamente.",
      });
    } else {
      // Se estamos na lista normal, mover para lixeira
      const updatedDocs = documents.map(doc => 
        selectedDocuments.has(doc.id) 
          ? { ...doc, isDeleted: true, deletedAt: new Date() }
          : doc
      );
      setDocuments(updatedDocs);
      localStorage.setItem('savedDocuments', JSON.stringify(updatedDocs));
      setSelectedDocuments(new Set());
      setShowBulkDeleteConfirm(false);

      toast({
        title: `${selectedDocuments.size} documento(s) movido(s) para lixeira`,
        description: "Os documentos podem ser restaurados na lixeira.",
      });
    }
  };

  const handleBulkDownload = (format: 'txt' | 'pdf') => {
    const selectedDocs = documents.filter(doc => selectedDocuments.has(doc.id));

    selectedDocs.forEach(doc => {
      const filename = generateFilename(doc.content, format);
      if (format === 'txt') {
        downloadTextFile(doc.content, filename);
      } else {
        downloadPDFFile(doc.content, filename);
      }
    });

    toast({
      title: "Downloads iniciados",
      description: `${selectedDocs.length} arquivo(s) serão baixados.`,
    });

    setSelectedDocuments(new Set());
  };

  const toggleDocumentSelection = (id: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedDocuments(newSelection);
  };

  const selectAllDocuments = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)));
    }
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
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {showTrash ? 'Lixeira' : 'Lista de Documentos'} ({filteredDocuments.length})
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowTrash(!showTrash);
                setSelectedDocuments(new Set());
              }}
              className="text-xs"
            >
              {showTrash ? 'Ver Documentos' : 'Ver Lixeira'}
            </Button>
            {selectedDocuments.size > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="text-xs"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Excluir ({selectedDocuments.size})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkDownload('txt')}
                  className="text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  TXT
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkDownload('pdf')}
                  className="text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  PDF
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Search Bar and Select All */}
        <div className="space-y-4 mb-4">
          <div className="relative">
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

          {filteredDocuments.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0}
                onCheckedChange={selectAllDocuments}
                id="select-all"
              />
              <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
                Selecionar todos ({filteredDocuments.length})
              </label>
            </div>
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
                  className={`border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors ${
                    selectedDocuments.has(doc.id) ? 'bg-accent/30 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <Checkbox
                      checked={selectedDocuments.has(doc.id)}
                      onCheckedChange={() => toggleDocumentSelection(doc.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold truncate flex-1 mr-2">
                          {doc.title}
                        </h3>
                        <div className="flex gap-2">
                          {!showTrash ? (
                            <>
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
                                onClick={() => confirmDeleteDocument(doc.id)}
                                className="text-xs"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => setDocumentToRestore(doc.id)}
                                className="text-xs"
                              >
                                Restaurar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDocumentToPermanentDelete(doc.id)}
                                className="text-xs"
                              >
                                Excluir
                              </Button>
                            </>
                          )}
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
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {doc.wordCount} palavras
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {doc.characterCount} caracteres
                          </Badge>
                        </div>
                      </div>
                    </div>
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

      {/* Single Delete Confirmation */}
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir este documento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteDocument} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão em Massa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir {selectedDocuments.size} documento(s) selecionado(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir Todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation */}
      <AlertDialog open={!!documentToRestore} onOpenChange={() => setDocumentToRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Restauração</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja restaurar este documento? Ele voltará para a lista de documentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={restoreDocument}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={!!documentToPermanentDelete} onOpenChange={() => setDocumentToPermanentDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão Permanente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir este documento permanentemente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={permanentDeleteDocument} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

export function saveDocument(content: string, title?: string): Document {
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const characterCount = content.length;
  const autoTitle = title || generateAutoTitle(content);

  const document: Document = {
    id: Date.now().toString(),
    title: autoTitle,
    content,
    createdAt: new Date(),
    lastModified: new Date(),
    wordCount,
    characterCount
  };

  const existingDocs = JSON.parse(localStorage.getItem('savedDocuments') || '[]');
  const updatedDocs = [...existingDocs, document];
  localStorage.setItem('savedDocuments', JSON.stringify(updatedDocs));

  // Trigger custom event to update DocumentManager
  window.dispatchEvent(new CustomEvent('documentsUpdated'));

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