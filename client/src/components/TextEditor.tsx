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
  Image,
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
import {
  downloadTextFile,
  downloadPDFFile,
  generateFilename,
} from "@/utils/fileExport";

// Defina um limite de tamanho para Data URIs a serem renderizados diretamente (ex: 50KB)
// Imagens maiores que isso serão mostradas como um placeholder de download.
const MAX_DIRECT_RENDER_BASE64_SIZE = 50 * 1024; // 50 KB

export function TextEditor() {
  const { toast } = useToast();
  // Alterado para um HTMLDivElement para o contenteditable
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState("");
  const [aiResultType, setAiResultType] = useState<
    "improve" | "summary" | "tags"
  >("improve");
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isDocumentManagerOpen, setIsDocumentManagerOpen] = useState(false);
  const [isMediaUploadOpen, setIsMediaUploadOpen] = useState(false);

  // useTextEditor agora precisa lidar com HTML diretamente
  const {
    content,
    wordCount,
    characterCount,
    isSaving,
    lastSaved,
    handleContentChange, // Este será reescrito ou adaptado
    saveContent,
  } = useTextEditor(); // Este hook também precisará de ajustes.

  const { theme, toggleTheme } = useTheme();
  const { improveText, generateSummary, suggestTags, isProcessing } = useAI();
  const {
    content: undoRedoContent, // Renomeado para evitar conflito com 'content' do useTextEditor
    canUndo,
    canRedo,
    updateContent: updateUndoRedoContent, // Renomeado
    undo,
    redo,
    clearHistory,
  } = useUndoRedo(content); // Passar o content inicial

  const preferences = useEditorPreferences();
  const primaryColor = preferences.primaryColor || "#7C3BED";

  // --- Adaptação do Input para contenteditable ---
  const handleEditorInput = useCallback(() => {
    // Quando o conteúdo do div contenteditable muda
    if (editorRef.current) {
      // Captura o innerHTML, que é o conteúdo real (com tags)
      const newContent = editorRef.current.innerHTML;
      // Atualiza o estado principal do editor (via useTextEditor)
      handleContentChange(newContent);
    }
  }, [handleContentChange]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const getVideoMimeType = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "mp4":
        return "video/mp4";
      case "webm":
        return "video/webm";
      case "ogg":
        return "video/ogg";
      case "avi":
        return "video/x-msvideo";
      case "mov":
        return "video/quicktime";
      default:
        return "video/mp4";
    }
  };

  // Funções de manipulação de mídia (MOVIDAS PARA CIMA PARA CORRIGIR O ERRO)
  const generateMediaElement = (media: MediaData): string => {
    const mediaId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // NOVO: Renderização de imagem/vídeo/arquivo com base no tamanho e tipo
    // Se for uma imagem e o tamanho for menor ou igual ao limite, renderiza direto.
    if (
      media.type === "image" &&
      media.url.length - media.url.indexOf(",") - 1 <=
        MAX_DIRECT_RENDER_BASE64_SIZE
    ) {
      return `<div class="media-container" data-media-id="${mediaId}">
<img src="${media.url}" alt="${media.name}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; display: block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
<div class="media-controls" style="margin-top: 8px; padding: 8px; background: rgba(255,255,255,0.9); border-radius: 6px; border: 1px solid rgba(0,0,0,0.1);">
  <span style="font-size: 12px; color: #333; font-weight: 500;">${media.name}</span>
  <button onclick="downloadMedia('${mediaId}', '${media.url}', '${media.name}')" style="margin-left: 10px; padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 500; transition: background 0.2s;">Download</button>
</div>
</div>`;
    }
    // Para vídeos, PDFs, e AGORA também imagens grandes (que excedem MAX_DIRECT_RENDER_BASE64_SIZE),
    // use o placeholder de arquivo.
    else {
      let icon = "📎"; // Ícone padrão para arquivo
      let typeLabel = "Arquivo";

      if (media.type === "image") {
        icon = "🖼️";
        typeLabel = "Imagem (muito grande)";
      } else if (media.type === "video") {
        icon = "🎥"; // Ícone de vídeo
        typeLabel = "Vídeo";
      } else if (media.type === "pdf") {
        icon = "📄";
        typeLabel = "Documento PDF";
      }

      return `<div class="media-container" data-media-id="${mediaId}">
<div style="border: 2px dashed #ccc; padding: 20px; text-align: center; border-radius: 8px; margin: 10px 0; background: rgba(255,255,255,0.5);">
  <span style="font-size: 24px;">${icon}</span>
  <p style="margin: 8px 0; font-weight: bold; color: #333;">${media.name}</p>
  <p style="margin: 4px 0; color: #666; font-size: 12px;">${typeLabel}</p>
  <button onclick="downloadMedia('${mediaId}', '${media.url}', '${media.name}')" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; transition: background 0.2s;">Download</button>
</div>
</div>`;
    }
  };

  const handleMediaInsert = useCallback(
    (mediaData: MediaData) => {
      // Com contenteditable, inserimos o HTML diretamente no cursor
      if (editorRef.current) {
        const mediaElementHtml = generateMediaElement(mediaData);
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents(); // Remove qualquer seleção atual

          // Criar um elemento temporário para converter o HTML em um nó DOM
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = mediaElementHtml;
          const fragment = document.createDocumentFragment();
          while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
          }

          range.insertNode(fragment); // Insere o nó HTML
          range.collapse(false); // Colapsa o range para o final da inserção
          selection.removeAllRanges();
          selection.addRange(range); // Move o cursor para o final da mídia inserida
        } else {
          // Se não houver seleção, apenas adiciona no final
          editorRef.current.innerHTML += mediaElementHtml;
        }
        // Trigger a atualização de conteúdo para useTextEditor e useUndoRedo
        handleEditorInput();
      }

      toast({
        title: "Mídia adicionada",
        description: `${mediaData.name} foi inserida no editor.`,
      });
    },
    [handleEditorInput, toast],
  ); // Adicionado toast como dependência

  // Sincronizar o estado 'content' do useTextEditor com o innerHTML do editorRef
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  // Sincronizar useUndoRedo com o content (se o content for alterado por outras funções, como carregar um documento)
  useEffect(() => {
    updateUndoRedoContent(content);
  }, [content, updateUndoRedoContent]);

  // Sincronizar o undo/redo com o editor
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== undoRedoContent) {
      editorRef.current.innerHTML = undoRedoContent;
      // Colocar o cursor no final (ou manter a posição se possível)
      const range = document.createRange();
      const sel = window.getSelection();
      if (editorRef.current.lastChild) {
        range.setStartAfter(editorRef.current.lastChild);
      } else {
        range.setStart(editorRef.current, 0);
      }
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [undoRedoContent]);
  // --- Fim da Adaptação do Input ---

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Manual save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveContent();
        toast({
          title: "Conteúdo salvo",
          description: "Seu texto foi salvo com sucesso.",
        });
      }

      // Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
      }

      // Redo
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

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.type.indexOf("image") !== -1) {
          e.preventDefault(); // Impedir colagem padrão (que pode não ser um Data URI direto)
          const file = item.getAsFile();
          if (!file) continue;

          try {
            const base64 = await fileToBase64(file);
            const mediaData: MediaData = {
              type: "image",
              name: `pasted_image_${Date.now()}.png`,
              url: base64,
              size: file.size,
            };

            handleMediaInsert(mediaData); // Usar a função de inserção de mídia

            toast({
              title: "Imagem colada",
              description: "A imagem foi adicionada ao editor.",
            });
          } catch (error) {
            toast({
              title: "Erro ao colar imagem",
              description: "Não foi possível processar a imagem.",
              variant: "destructive",
            });
          }
        }
      }
    };

    // Event listeners no editorRef, não no document global
    if (editorRef.current) {
      editorRef.current.addEventListener("keydown", handleKeyDown);
      editorRef.current.addEventListener("paste", handlePaste);
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener("keydown", handleKeyDown);
        editorRef.current.removeEventListener("paste", handlePaste);
      }
    };
  }, [saveContent, toast, canUndo, canRedo, undo, redo, handleMediaInsert]);

  const handleTextSelection = () => {
    // Com contenteditable, a seleção é gerenciada pelo navegador
    // Se precisar da seleção, use window.getSelection()
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      setSelectedText(selection.toString());
    } else {
      setSelectedText("");
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
    if (!editorRef.current || !editorRef.current.textContent?.trim()) {
      toast({
        title: "Nenhum conteúdo",
        description: "Digite algum conteúdo antes de gerar um resumo.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Usar textContent para o resumo para evitar problemas com HTML na IA
      const result = await generateSummary(editorRef.current.textContent);
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
    if (!editorRef.current || !editorRef.current.textContent?.trim()) {
      toast({
        title: "Nenhum conteúdo",
        description: "Digite algum conteúdo antes de sugerir tags.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await suggestTags(editorRef.current.textContent);
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
    if (aiResultType === "improve" && editorRef.current && selectedText) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // Extrair o texto melhorado
        const improvedText =
          modalContent.split('Texto melhorado: "')[1]?.split('"\n')[0] ||
          selectedText;

        // Substituir a seleção com o novo texto
        range.deleteContents(); // Remove o texto selecionado
        range.insertNode(document.createTextNode(improvedText)); // Insere o texto melhorado
      }

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
    // Sempre salva o conteúdo atual se existir (lendo do editorRef)
    if (editorRef.current && editorRef.current.innerHTML.trim()) {
      const savedDoc = saveDocument(editorRef.current.innerHTML);
      toast({
        title: "Documento salvo",
        description: `"${savedDoc.title}" foi salvo automaticamente.`,
      });
    }

    // Limpa o editor
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    clearHistory(); // Limpa o histórico do undo/redo

    toast({
      title: "Novo documento",
      description: "Começando com uma página em branco.",
    });
  };

  const handleLoadDocument = (document: any) => {
    // Salva o documento atual antes de carregar um novo
    if (editorRef.current && editorRef.current.innerHTML.trim()) {
      saveDocument(editorRef.current.innerHTML);
    }

    // Carrega o novo documento no editor
    if (editorRef.current) {
      editorRef.current.innerHTML = document.content;
    }
    updateUndoRedoContent(document.content); // Atualiza o histórico com o novo conteúdo
    clearHistory(); // Limpa o histórico para o novo documento

    toast({
      title: "Documento carregado",
      description: `"${document.title}" foi carregado no editor.`,
    });
  };

  const handleDownloadTxt = () => {
    if (!editorRef.current || !editorRef.current.textContent?.trim()) {
      toast({
        title: "Nenhum conteúdo",
        description: "Digite algum conteúdo antes de baixar.",
        variant: "destructive",
      });
      return;
    }

    const filename = generateFilename(editorRef.current.textContent, "txt");
    downloadTextFile(editorRef.current.textContent, filename);

    toast({
      title: "Download iniciado",
      description: `Arquivo ${filename} será baixado.`,
    });
  };

  const handleDownloadPdf = () => {
    if (!editorRef.current || !editorRef.current.textContent?.trim()) {
      toast({
        title: "Nenhum conteúdo",
        description: "Digite algum conteúdo antes de baixar.",
        variant: "destructive",
      });
      return;
    }

    const filename = generateFilename(editorRef.current.textContent, "pdf");
    downloadPDFFile(editorRef.current.textContent, filename);

    toast({
      title: "PDF será gerado",
      description: "Uma nova janela será aberta para imprimir como PDF.",
    });
  };

  // Com contenteditable, não precisamos de um renderMediaContent complexo para o preview.
  // O próprio contenteditable div renderiza o HTML diretamente.
  // Mantemos esta função para depuração, se necessário.
  const getEditorContentForDisplay = (): string => {
    return content; // O conteúdo já deve ser HTML válido aqui
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

            <Button
              onClick={() => setIsMediaUploadOpen(true)}
              variant="outline"
              size="icon"
              aria-label="Mídia"
            >
              <Image className="h-3 w-3" />
            </Button>

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
            {/* O div contenteditable AGORA É O EDITOR PRINCIPAL */}
            <div
              ref={editorRef}
              contentEditable="true"
              onInput={handleEditorInput}
              onSelect={handleTextSelection}
              // Não precisamos mais do placeholder aqui, o conteúdo inicial será o padrão ou carregado
              data-placeholder="Comece a escrever aqui... Seu texto será salvo automaticamente."
              className="editor-contenteditable w-full h-full resize-none border-none outline-none bg-transparent placeholder:text-muted-foreground relative z-10"
              style={{ caretColor: "currentColor" }} // Cursor deve ser visível
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
