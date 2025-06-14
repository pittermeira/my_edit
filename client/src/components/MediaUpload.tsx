import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Image, Video, FileText, Upload, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MediaUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onMediaInsert: (mediaData: MediaData) => void;
}

export interface MediaData {
  type: 'image' | 'video' | 'pdf';
  name: string;
  url: string;
  size: number;
}

const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  video: 20 * 1024 * 1024, // 20MB
  pdf: 10 * 1024 * 1024, // 10MB
};

const ACCEPTED_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'],
  pdf: ['application/pdf']
};

export function MediaUpload({ isOpen, onClose, onMediaInsert }: MediaUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getFileType = (file: File): 'image' | 'video' | 'pdf' | null => {
    if (ACCEPTED_TYPES.image.includes(file.type)) return 'image';
    if (ACCEPTED_TYPES.video.includes(file.type)) return 'video';
    if (ACCEPTED_TYPES.pdf.includes(file.type)) return 'pdf';
    return null;
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const fileType = getFileType(file);
    
    if (!fileType) {
      return { valid: false, error: 'Tipo de arquivo não suportado' };
    }

    if (file.size > MAX_FILE_SIZES[fileType]) {
      const maxSizeMB = MAX_FILE_SIZES[fileType] / (1024 * 1024);
      return { valid: false, error: `Arquivo muito grande. Máximo ${maxSizeMB}MB para ${fileType}` };
    }

    return { valid: true };
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        title: "Erro no arquivo",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Convert file to base64 for local storage
      const fileReader = new FileReader();
      fileReader.onload = () => {
        const base64 = fileReader.result as string;
        const mediaData: MediaData = {
          type: getFileType(file)!,
          name: file.name,
          url: base64,
          size: file.size
        };

        // Store in localStorage with size limit check
        try {
          const mediaKey = `media_${Date.now()}`;
          localStorage.setItem(mediaKey, JSON.stringify(mediaData));
          
          clearInterval(progressInterval);
          setUploadProgress(100);
          
          setTimeout(() => {
            onMediaInsert(mediaData);
            onClose();
            setIsUploading(false);
            setUploadProgress(0);
            
            toast({
              title: "Arquivo carregado",
              description: `${file.name} foi adicionado ao editor.`,
            });
          }, 500);
        } catch (error) {
          throw new Error('Falha ao salvar arquivo. Arquivo muito grande.');
        }
      };

      fileReader.onerror = () => {
        throw new Error('Erro ao ler arquivo');
      };

      fileReader.readAsDataURL(file);
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Falha ao carregar arquivo",
        variant: "destructive"
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Adicionar Mídia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isUploading ? (
            <div className="space-y-4">
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
                <p className="text-sm text-muted-foreground">Carregando arquivo...</p>
              </div>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-center text-muted-foreground">
                {uploadProgress}% concluído
              </p>
            </div>
          ) : (
            <>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer" onClick={handleUploadClick}>
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Clique para carregar arquivo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ou arraste e solte aqui
                </p>
                <Button variant="outline" size="sm">
                  Escolher Arquivo
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Tipos de arquivo aceitos:</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Image className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Imagens</p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, GIF, WebP (máx. {formatFileSize(MAX_FILE_SIZES.image)})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Vídeos</p>
                      <p className="text-xs text-muted-foreground">
                        MP4, WebM, OGG, AVI, MOV (máx. {formatFileSize(MAX_FILE_SIZES.video)})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">PDFs</p>
                      <p className="text-xs text-muted-foreground">
                        Documentos PDF (máx. {formatFileSize(MAX_FILE_SIZES.pdf)})
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Os arquivos são armazenados localmente no seu navegador. Arquivos muito grandes podem afetar a performance.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={[...ACCEPTED_TYPES.image, ...ACCEPTED_TYPES.video, ...ACCEPTED_TYPES.pdf].join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            {isUploading ? 'Carregando...' : 'Cancelar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}