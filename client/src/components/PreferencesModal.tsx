import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Palette, Type, AlignLeft } from "lucide-react";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface EditorPreferences {
  fontFamily: string;
  fontSize: number;
  lineSpacing: number;
  backgroundColor: string;
  textColor: string;
}

const DEFAULT_PREFERENCES: EditorPreferences = {
  fontFamily: 'Merriweather',
  fontSize: 18,
  lineSpacing: 1.75,
  backgroundColor: '#000000',
  textColor: '#00FF00'
};

const FONT_OPTIONS = [
  { value: 'Merriweather', label: 'Merriweather (Serif)' },
  { value: 'Inter', label: 'Inter (Sans-serif)' },
  { value: 'Georgia', label: 'Georgia (Serif)' },
  { value: 'Arial', label: 'Arial (Sans-serif)' },
  { value: 'Times New Roman', label: 'Times New Roman (Serif)' },
  { value: 'Helvetica', label: 'Helvetica (Sans-serif)' },
  { value: 'Courier New', label: 'Courier New (Monospace)' },
];

const LINE_SPACING_OPTIONS = [
  { value: 1, label: 'Single' },
  { value: 1.5, label: '1.5' },
  { value: 2, label: 'Double' },
];

const PRESET_COLORS = {
  backgrounds: ['#000000', '#1a1a1a', '#2d2d2d', '#ffffff', '#f5f5f5', '#0d1117'],
  texts: ['#00FF00', '#ffffff', '#000000', '#00d4aa', '#ff6b6b', '#4dabf7', '#ffd43b']
};

export function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  const [preferences, setPreferences] = useState<EditorPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const saved = localStorage.getItem('editorPreferences');
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  }, []);

  const savePreferences = (newPreferences: EditorPreferences) => {
    setPreferences(newPreferences);
    localStorage.setItem('editorPreferences', JSON.stringify(newPreferences));
    
    // Apply preferences to CSS variables
    const root = document.documentElement;
    root.style.setProperty('--editor-bg', newPreferences.backgroundColor);
    root.style.setProperty('--editor-text', newPreferences.textColor);
    root.style.setProperty('--editor-font', newPreferences.fontFamily);
    root.style.setProperty('--editor-font-size', `${newPreferences.fontSize}px`);
    root.style.setProperty('--editor-line-height', newPreferences.lineSpacing.toString());
    
    // Dispatch custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('preferencesChanged', { detail: newPreferences }));
  };

  const handleSave = () => {
    savePreferences(preferences);
    onClose();
  };

  const handleReset = () => {
    savePreferences(DEFAULT_PREFERENCES);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Preferências do Editor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Font Family */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Fonte
            </Label>
            <Select 
              value={preferences.fontFamily} 
              onValueChange={(value) => setPreferences(prev => ({ ...prev, fontFamily: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map(font => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <Label>Tamanho da Fonte: {preferences.fontSize}px</Label>
            <Slider
              value={[preferences.fontSize]}
              onValueChange={([value]) => setPreferences(prev => ({ ...prev, fontSize: value }))}
              min={12}
              max={32}
              step={1}
              className="w-full"
            />
          </div>

          {/* Line Spacing */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <AlignLeft className="w-4 h-4" />
              Espaçamento entre Linhas
            </Label>
            <Select 
              value={preferences.lineSpacing.toString()} 
              onValueChange={(value) => setPreferences(prev => ({ ...prev, lineSpacing: parseFloat(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINE_SPACING_OPTIONS.map(spacing => (
                  <SelectItem key={spacing.value} value={spacing.value.toString()}>
                    {spacing.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Background Color */}
          <div className="space-y-2">
            <Label>Cor de Fundo</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.backgrounds.map(color => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded border-2 ${preferences.backgroundColor === color ? 'border-white' : 'border-gray-400'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setPreferences(prev => ({ ...prev, backgroundColor: color }))}
                />
              ))}
            </div>
            <input
              type="color"
              value={preferences.backgroundColor}
              onChange={(e) => setPreferences(prev => ({ ...prev, backgroundColor: e.target.value }))}
              className="w-full h-10 rounded border border-border"
            />
          </div>

          {/* Text Color */}
          <div className="space-y-2">
            <Label>Cor do Texto</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.texts.map(color => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded border-2 ${preferences.textColor === color ? 'border-white' : 'border-gray-400'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setPreferences(prev => ({ ...prev, textColor: color }))}
                />
              ))}
            </div>
            <input
              type="color"
              value={preferences.textColor}
              onChange={(e) => setPreferences(prev => ({ ...prev, textColor: e.target.value }))}
              className="w-full h-10 rounded border border-border"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button onClick={handleSave} className="flex-1">
            Salvar
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Restaurar Padrão
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useEditorPreferences() {
  const [preferences, setPreferences] = useState<EditorPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const saved = localStorage.getItem('editorPreferences');
    if (saved) {
      const parsedPreferences = JSON.parse(saved);
      setPreferences(parsedPreferences);
      
      // Apply preferences on load
      const root = document.documentElement;
      root.style.setProperty('--editor-bg', parsedPreferences.backgroundColor);
      root.style.setProperty('--editor-text', parsedPreferences.textColor);
      root.style.setProperty('--editor-font', parsedPreferences.fontFamily);
      root.style.setProperty('--editor-font-size', `${parsedPreferences.fontSize}px`);
      root.style.setProperty('--editor-line-height', parsedPreferences.lineSpacing.toString());
    }

    const handlePreferencesChange = (event: CustomEvent<EditorPreferences>) => {
      setPreferences(event.detail);
    };

    window.addEventListener('preferencesChanged', handlePreferencesChange as EventListener);
    return () => window.removeEventListener('preferencesChanged', handlePreferencesChange as EventListener);
  }, []);

  return preferences;
}