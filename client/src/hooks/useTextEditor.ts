import { useState, useEffect, useCallback } from "react";

interface UseTextEditorReturn {
  content: string;
  wordCount: number;
  characterCount: number;
  isSaving: boolean;
  lastSaved: Date | null;
  handleContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  saveContent: () => void;
}

export function useTextEditor(): UseTextEditorReturn {
  const [content, setContent] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load saved content on mount
  useEffect(() => {
    const savedContent = localStorage.getItem('editorContent');
    const savedTime = localStorage.getItem('lastSaveTime');
    
    if (savedContent) {
      setContent(savedContent);
    }
    
    if (savedTime) {
      setLastSaved(new Date(savedTime));
    }
  }, []);

  // Update counters when content changes
  useEffect(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const characters = content.length;
    
    setWordCount(words);
    setCharacterCount(characters);
  }, [content]);

  const saveContent = useCallback(() => {
    localStorage.setItem('editorContent', content);
    const now = new Date();
    localStorage.setItem('lastSaveTime', now.toISOString());
    setLastSaved(now);
    setIsSaving(false);
  }, [content]);

  const scheduleAutoSave = useCallback(() => {
    setIsSaving(true);
    
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(() => {
      saveContent();
    }, 1000); // 1 second delay
    
    setSaveTimeout(timeout);
  }, [saveTimeout, saveContent]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  return {
    content,
    wordCount,
    characterCount,
    isSaving,
    lastSaved,
    handleContentChange,
    saveContent
  };
}
