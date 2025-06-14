import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Edit3, 
  FileText, 
  Tag, 
  Check, 
  Loader2, 
  X,
  Copy,
  Clock,
  Settings,
  Plus,
  FolderOpen,
  Undo2,
  Redo2,
  Download,
  Image
} from "lucide-react";
import { useTextEditor } from "@/hooks/useTextEditor";
import { useTheme } from "@/hooks/useTheme";
import { useAI } from "@/hooks/useAI";
import { useToast } from "@/hooks/use-toast";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useEditorPreferences } from "@/components/PreferencesModal";
import { PreferencesModal } from "@/components/PreferencesModal";
import { DocumentManager, saveDocument } from "@/components/DocumentManager";
import { MediaUpload, type MediaData } from "@/components/MediaUpload";
import { downloadTextFile, downloadPDFFile, generateFilename } from "@/utils/fileExport";

export function TextEditor() {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState("");
  const [aiResultType, setAiResultType] = useState<"improve" | "summary" | "tags">("improve");
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isDocumentManagerOpen, setIsDocumentManagerOpen] = useState(false);
  const [isMediaUploadOpen, setIsMediaUploadOpen] = useState(false);
  const [insertedMedia, setInsertedMedia] = useState<MediaData[]>([]);

  const {
    content,
    wordCount,
    characterCount,
    isSaving,
    lastSaved,
    handleContentChange,
    saveContent
  } = useTextEditor();

  const { theme, toggleTheme } = useTheme();
  const { improveText, generateSummary, suggestTags, isProcessing } = useAI();
  const { 
    content: undoContent, 
    canUndo, 
    canRedo, 
    updateContent: updateUndoContent, 
    undo, 
    redo,
    clearHistory 
  } = useUndoRedo(content);
  const preferences = useEditorPreferences();

  // Sync undo/redo content with main content
  useEffect(() => {
    if (undoContent !== content) {
      handleContentChange({ target: { value: undoContent } } as any);
    }
  }, [undoContent]);

  useEffect(() => {
    updateUndoContent(content);
  }, [content]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S for manual save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveContent();
        toast({
          title: "Conteúdo salvo",
          description: "Seu texto foi salvo com sucesso.",
        });
      }

      // Ctrl/Cmd + Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
      }

      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z for redo
      if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveContent, toast, canUndo, canRedo, undo, redo]);

  const handleTextSelection = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selection = content.substring(start, end);
      setSelectedText(selection);
    }
  };

  const handleImproveText = async () => {
    if (!selectedText.trim()) {
      toast({
        title: "Nenhum texto selecionado",
        description: "Por favor, selecione um texto para melhorar.",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await improveText(selectedText);
      setModalTitle("Texto Melhorado");
      setModalContent(result);
      setAiResultType("improve");
      setIsModalOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao melhorar texto",
        description: "Tente novamente em alguns segundos.",
        variant: "destructive"
      });
    }
  };

  const handleGenerateSummary = async () => {
    if (!content.trim()) {
      toast({
        title: "Nenhum conteúdo",
        description: "Digite algum conteúdo antes de gerar um resumo.",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await generateSummary(content);
      setModalTitle("Resumo Gerado");
      setModalContent(result);
      setAiResultType("summary");
      setIsModalOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao gerar resumo",
        description: "Tente novamente em alguns segundos.",
        variant: "destructive"
      });
    }
  };

  const handleSuggestTags = async () => {
    if (!content.trim()) {
      toast({
        title: "Nenhum conteúdo",
        description: "Digite algum conteúdo antes de sugerir tags.",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await suggestTags(content);
      setModalTitle("Tags Sugeridas");
      setModalContent(result);
      setAiResultType("tags");
      setIsModalOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao sugerir tags",
        description: "Tente novamente em alguns segundos.",
        variant: "destructive"
      });
    }
  };

  const handleAcceptSuggestion = () => {
    if (aiResultType === "improve" && textareaRef.current && selectedText) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const beforeSelection = content.substring(0, start);
      const afterSelection = content.substring(end);
      
      // Extract the improved text from the modal content (simplified approach)
      const improvedText = modalContent.split("Texto melhorado: \"")[1]?.split("\"\n")[0] || selectedText + " [MELHORADO]";
      
      const newContent = beforeSelection + improvedText + afterSelection;
      handleContentChange({ target: { value: newContent } } as any);
      
      toast({
        title: "Texto substituído",
        description: "O texto selecionado foi melhorado com sucesso.",
      });
    }
    setIsModalOpen(false);
  };

  const handleCopySuggestion = async () => {
    try {
      await navigator.clipboard.writeText(modalContent);
      toast({
        title: "Copiado!",
        description: "Conteúdo copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar para a área de transferência.",
        variant: "destructive"
      });
    }
  };

  const handleNewDocument = () => {
    // Always save current content if it exists
    if (content.trim()) {
      const savedDoc = saveDocument(content);
      toast({
        title: "Documento salvo",
        description: `"${savedDoc.title}" foi salvo automaticamente.`,
      });
    }
    
    // Clear editor and start fresh
    handleContentChange({ target: { value: "" } } as any);
    clearHistory();
    
    toast({
      title: "Novo documento",
      description: "Começando com uma página em branco.",
    });
  };

  const handleLoadDocument = (document: any) => {
    if (content.trim()) {
      saveDocument(content);
    }
    
    handleContentChange({ target: { value: document.content } } as any);
    clearHistory();
  };

  const handleDownloadTxt = () => {
    if (!content.trim()) {
      toast({
        title: "Nenhum conteúdo",
        description: "Digite algum conteúdo antes de baixar.",
        variant: "destructive"
      });
      return;
    }
    
    const filename = generateFilename(content, 'txt');
    downloadTextFile(content, filename);
    
    toast({
      title: "Download iniciado",
      description: `Arquivo ${filename} será baixado.`,
    });
  };

  const handleDownloadPdf = () => {
    if (!content.trim()) {
      toast({
        title: "Nenhum conteúdo",
        description: "Digite algum conteúdo antes de baixar.",
        variant: "destructive"
      });
      return;
    }
    
    const filename = generateFilename(content, 'pdf');
    downloadPDFFile(content, filename);
    
    toast({
      title: "PDF será gerado",
      description: "Uma nova janela será aberta para imprimir como PDF.",
    });
  };

  const handleMediaInsert = (mediaData: MediaData) => {
    const mediaElement = generateMediaElement(mediaData);
    const newContent = content + '\n\n' + mediaElement + '\n\n';
    handleContentChange({ target: { value: newContent } } as any);
    setInsertedMedia(prev => [...prev, mediaData]);
  };

  const generateMediaElement = (media: MediaData): string => {
    switch (media.type) {
      case 'image':
        return `[IMAGEM: ${media.name}]`;
      case 'video':
        return `[VÍDEO: ${media.name}]`;
      case 'pdf':
        return `[PDF: ${media.name}]`;
      default:
        return `[ARQUIVO: ${media.name}]`;
    }
  };

  const formatLastSaved = () => {
    if (!lastSaved) return "";
    return `Última alteração: ${lastSaved.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 p-4 flex justify-between items-center border-b border-border">
        <h1 className="text-xl font-bold font-sans text-foreground">My Edit</h1>
        
        <div className="flex items-center gap-2">
          {/* File Operations */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewDocument}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Novo
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDocumentManagerOpen(true)}
            className="text-xs"
          >
            <FolderOpen className="h-3 w-3 mr-1" />
            Documentos
          </Button>

          {/* Undo/Redo */}
          <Button
            variant="outline"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Desfazer"
          >
            <Undo2 className="h-3 w-3" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Refazer"
          >
            <Redo2 className="h-3 w-3" />
          </Button>

          {/* Download Options */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTxt}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            TXT
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            className="text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            PDF
          </Button>

          {/* Settings */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsPreferencesOpen(true)}
            aria-label="Preferências"
          >
            <Settings className="h-3 w-3" />
          </Button>
          

        </div>
      </header>
      {/* AI Buttons Bar */}
      <div className="flex-shrink-0 p-2 border-b border-border">
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            onClick={handleImproveText}
            disabled={!selectedText.trim() || isProcessing}
            style={{ 
              backgroundColor: '#3E1E77', 
              color: preferences.textColor,
              borderColor: preferences.textColor 
            }}
            className="hover:opacity-80"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Melhorar Texto
          </Button>
          
          <Button
            onClick={handleGenerateSummary}
            disabled={!content.trim() || isProcessing}
            style={{ 
              backgroundColor: '#059669', 
              color: preferences.textColor,
              borderColor: preferences.textColor 
            }}
            className="hover:opacity-80"
          >
            <FileText className="w-4 h-4 mr-2" />
            Gerar Resumo
          </Button>
          
          <Button
            onClick={handleSuggestTags}
            disabled={!content.trim() || isProcessing}
            style={{ 
              backgroundColor: '#D97706', 
              color: preferences.textColor,
              borderColor: preferences.textColor 
            }}
            className="hover:opacity-80"
          >
            <Tag className="w-4 h-4 mr-2" />
            Sugerir Tags
          </Button>

          <Button
            onClick={() => setIsMediaUploadOpen(true)}
            variant="outline"
            className="text-xs"
          >
            <Image className="h-3 w-3 mr-1" />
            Mídia
          </Button>
        </div>

        {/* AI Processing Indicator */}
        {isProcessing && (
          <div className="mt-3 text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-sans bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              <Loader2 className="animate-spin -ml-1 mr-2 h-3 w-3" />
              IA processando...
            </div>
          </div>
        )}
      </div>
      {/* Main Editor */}
      <main className="editor-main flex-1 min-h-0">
        <div className="editor-container h-full p-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onSelect={handleTextSelection}
            placeholder="Comece a escrever aqui... Seu texto será salvo automaticamente."
            className="editor-textarea w-full h-full resize-none border-none outline-none bg-transparent placeholder:text-muted-foreground"
          />
        </div>
      </main>
      {/* Footer */}
      <footer className="flex-shrink-0 p-4 border-t border-border bg-background/50 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm font-sans">
          {/* Left side: Counters */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {wordCount} palavras
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {characterCount} caracteres
              </span>
            </div>
          </div>

          {/* Right side: Save Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                  <span className="text-amber-600 dark:text-amber-400">Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Salvo</span>
                </>
              )}
            </div>

            {lastSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatLastSaved()}
              </span>
            )}
          </div>
        </div>
      </footer>
      {/* AI Results Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {modalTitle}
            </DialogTitle>
            <DialogDescription>
              Resultado gerado pela inteligência artificial
            </DialogDescription>
          </DialogHeader>
          
          <Separator />
          
          <div className="modal-content overflow-y-auto flex-1 py-4">
            <div className="font-serif text-base leading-relaxed whitespace-pre-line">
              {modalContent}
            </div>
          </div>
          
          <Separator />
          
          <div className="flex gap-3 pt-4">
            {aiResultType === "improve" && (
              <Button onClick={handleAcceptSuggestion} className="bg-primary hover:bg-primary/90">
                Substituir Texto
              </Button>
            )}
            
            <Button variant="outline" onClick={handleCopySuggestion}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Preferences Modal */}
      <PreferencesModal 
        isOpen={isPreferencesOpen} 
        onClose={() => setIsPreferencesOpen(false)} 
      />
      {/* Document Manager Modal */}
      <DocumentManager 
        isOpen={isDocumentManagerOpen} 
        onClose={() => setIsDocumentManagerOpen(false)}
        onLoadDocument={handleLoadDocument}
      />

      {/* Media Upload Modal */}
      <MediaUpload 
        isOpen={isMediaUploadOpen} 
        onClose={() => setIsMediaUploadOpen(false)}
        onMediaInsert={handleMediaInsert}
      />
    </div>
  );
}
