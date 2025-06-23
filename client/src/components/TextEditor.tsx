import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Palette,
  User,
  Save,
  Upload,
  Brain,
  Lightbulb,
  Hash,
  Sun,
  Moon,
} from "lucide-react";
import { useTextEditor } from "@/hooks/useTextEditor";
import { useTheme } from "@/hooks/useTheme";
import { useAI } from "@/hooks/useAI";
import { useToast } from "@/hooks/use-toast";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useEditorPreferences } from "@/components/PreferencesModal";
import { PreferencesModal } from "@/components/PreferencesModal";

import { DocumentManager, saveDocument } from "@/components/DocumentManager";
import { useAuth } from "@/hooks/useAuth";

import {
  downloadTextFile,
  downloadPDFFile,
  generateFilename,
} from "@/utils/fileExport";

export function TextEditor() {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState("");
  const [aiResultType, setAiResultType] = useState<
    "improve" | "summary" | "tags"
  >("improve");
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isDocumentManagerOpen, setIsDocumentManagerOpen] = useState(false);
  
  const {
    content,
    wordCount,
    characterCount,
    isSaving,
    lastSaved,
    handleContentChange,
    saveContent,
  } = useTextEditor();

  const { theme, toggleTheme } = useTheme();
  const preferences = useEditorPreferences();
  const { user, isAuthenticated, login, register, logout } = useAuth();
  const { improveText, generateSummary, suggestTags, isProcessing } = useAI();
  const {
    content: undoContent,
    canUndo,
    canRedo,
    updateContent: updateUndoContent,
    undo,
    redo,
    clearHistory,
  } = useUndoRedo(content);

  // Get primary color from preferences
  const primaryColor = preferences.primaryColor || "#7C3BED";

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
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveContent();
        toast({
          title: "Conteúdo salvo",
          description: "Seu texto foi salvo com sucesso.",
        });
      }

      // Ctrl/Cmd + Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
      }

      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z for redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z")
      ) {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
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
        variant: "destructive",
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
        variant: "destructive",
      });
    }
  };

  const handleGenerateSummary = async () => {
    if (!content.trim()) {
      toast({
        title: "Nenhum conteúdo",
        description: "Digite algum conteúdo antes de gerar um resumo.",
        variant: "destructive",
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
        variant: "destructive",
      });
    }
  };

  const handleSuggestTags = async () => {
    if (!content.trim()) {
      toast({
        title: "Nenhum conteúdo",
        description: "Digite algum conteúdo antes de sugerir tags.",
        variant: "destructive",
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
        variant: "destructive",
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
      const improvedText =
        modalContent.split('Texto melhorado: "')[1]?.split('"\n')[0] ||
        selectedText + " [MELHORADO]";

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
        variant: "destructive",
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
        variant: "destructive",
      });
      return;
    }

    const filename = generateFilename(content, "txt");
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
        variant: "destructive",
      });
      return;
    }

    const filename = generateFilename(content, "pdf");
    downloadPDFFile(content, filename);

    toast({
      title: "PDF será gerado",
      description: "Uma nova janela será aberta para imprimir como PDF.",
    });
  };

  const renderContent = (): string => {
    return content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>")
  };

  const formatLastSaved = () => {
    if (!lastSaved) return "";
    return `Última alteração: ${lastSaved.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border p-2 md:p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-lg md:text-xl font-bold font-sans text-foreground">
            My Edit
          </h1>

          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
            {/* File Operations */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewDocument}
              className="text-xs hidden md:flex"
            >
              <Plus className="h-3 w-3 mr-1" />
              Novo
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNewDocument}
              className="md:hidden"
              aria-label="Novo"
            >
              <Plus className="h-3 w-3" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDocumentManagerOpen(true)}
              className="text-xs hidden md:flex"
            >
              <FolderOpen className="h-3 w-3 mr-1" />
              Documentos
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDocumentManagerOpen(true)}
              className="md:hidden"
              aria-label="Documentos"
            >
              <FolderOpen className="h-3 w-3" />
            </Button>

            {/* AI Buttons */}
            <Button
              onClick={handleImproveText}
              disabled={!selectedText.trim() || isProcessing}
              variant="outline"
              size="sm"
              className="text-xs hidden lg:flex"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              Melhorar Texto
            </Button>
            <Button
              onClick={handleImproveText}
              disabled={!selectedText.trim() || isProcessing}
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Melhorar Texto"
            >
              <Edit3 className="w-3 h-3" />
            </Button>

            <Button
              onClick={handleGenerateSummary}
              disabled={!content.trim() || isProcessing}
              variant="outline"
              size="sm"
              className="text-xs hidden lg:flex"
            >
              <FileText className="w-3 h-3 mr-1" />
              Gerar Resumo
            </Button>
            <Button
              onClick={handleGenerateSummary}
              disabled={!content.trim() || isProcessing}
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Gerar Resumo"
            >
              <FileText className="w-3 h-3" />
            </Button>

            <Button
              onClick={handleSuggestTags}
              disabled={!content.trim() || isProcessing}
              variant="outline"
              size="sm"
              className="text-xs hidden lg:flex"
            >
              <Tag className="w-3 h-3 mr-1" />
              Sugerir Tags
            </Button>
            <Button
              onClick={handleSuggestTags}
              disabled={!content.trim() || isProcessing}
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Sugerir Tags"
            >
              <Tag className="w-3 h-3" />
            </Button>

            {/* Highlight Text */}

            {/* Undo/Redo */}
            <Button
              variant="outline"
              size="icon"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Desfazer"
              className="hidden md:flex"
            >
              <Undo2 className="h-3 w-3" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Refazer"
              className="hidden md:flex"
            >
              <Redo2 className="h-3 w-3" />
            </Button>

            {/* Download Options */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTxt}
              className="text-xs hidden md:flex"
            >
              <Download className="h-3 w-3 mr-1" />
              TXT
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              className="text-xs hidden md:flex"
            >
              <Download className="h-3 w-3 mr-1" />
              PDF
            </Button>

            {/* Authentication */}
            {isAuthenticated && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground hidden lg:inline">
                  {user?.username}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="text-xs hidden md:flex"
                  title={`Logout (${user?.username})`}
                >
                  <User className="h-3 w-3 mr-1" />
                  Sair
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={logout}
                  className="md:hidden"
                  title={`Logout (${user?.username})`}
                  aria-label="Logout"
                >
                  <User className="h-3 w-3" />
                </Button>
              </div>
            )}

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
        </div>
      </header>
      {/* AI Processing Indicator */}
      {isProcessing && (
        <div className="fixed top-20 left-0 right-0 z-[60] flex-shrink-0 p-2 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-sans bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              <Loader2 className="animate-spin -ml-1 mr-2 h-3 w-3" />
              IA processando...
            </div>
          </div>
        </div>
      )}
      {/* Main Editor */}
      <main className="editor-main flex-1 pt-16 md:pt-20 pb-20 md:pb-24 min-h-0">
        <div className="editor-container h-full p-2 md:p-4">
          <div className="relative h-full">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onSelect={handleTextSelection}
              placeholder="Comece a escrever aqui... Seu texto será salvo automaticamente."
              className="editor-textarea w-full h-full resize-none border-none outline-none bg-transparent placeholder:text-muted-foreground relative z-10"
              style={{ color: "transparent", caretColor: "currentColor" }}
            />
            <div
              className="editor-content-preview absolute top-0 left-0 w-full h-full pointer-events-none p-4"
              style={{
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                fontFamily: "inherit",
                fontSize: "inherit",
                lineHeight: "inherit",
                color: "var(--foreground)",
                zIndex: 5,
              }}
              dangerouslySetInnerHTML={{ __html: renderContent() }}
            />
          </div>
        </div>
      </main>
      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 p-2 md:p-4 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 text-xs md:text-sm font-sans">
          {/* Left side: Counters */}
          <div className="flex items-center gap-3 md:gap-6">
            <div className="flex items-center gap-1 md:gap-2">
              <FileText className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {wordCount} palavras
              </span>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              <Edit3 className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {characterCount} caracteres
              </span>
            </div>
          </div>

          {/* Right side: Save Status */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1 md:gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin text-amber-600 dark:text-amber-400" />
                  <span className="text-amber-600 dark:text-amber-400">
                    Salvando...
                  </span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 md:w-4 md:h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Salvo
                  </span>
                </>
              )}
            </div>

            {lastSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 hidden md:flex">
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
            <DialogTitle>{modalTitle}</DialogTitle>
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
              <Button
                onClick={handleAcceptSuggestion}
                style={{
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                }}
                className="text-white hover:opacity-90"
              >
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
        currentContent={content}
        user={user}
      />

      
    </div>
  );
}

const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: any) => {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};