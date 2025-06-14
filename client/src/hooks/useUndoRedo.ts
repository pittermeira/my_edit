import { useState, useCallback, useRef } from "react";

interface UndoRedoState {
  past: string[];
  present: string;
  future: string[];
}

interface UseUndoRedoReturn {
  content: string;
  canUndo: boolean;
  canRedo: boolean;
  updateContent: (newContent: string) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

const MAX_HISTORY_SIZE = 50;

export function useUndoRedo(initialContent: string = ""): UseUndoRedoReturn {
  const [state, setState] = useState<UndoRedoState>({
    past: [],
    present: initialContent,
    future: []
  });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef(initialContent);

  const updateContent = useCallback((newContent: string) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update present immediately for smooth typing
    setState(prevState => ({
      ...prevState,
      present: newContent
    }));

    // Debounce history updates
    timeoutRef.current = setTimeout(() => {
      if (lastContentRef.current !== newContent) {
        setState(prevState => {
          const newPast = [...prevState.past, lastContentRef.current];
          
          // Limit history size
          if (newPast.length > MAX_HISTORY_SIZE) {
            newPast.shift();
          }

          return {
            past: newPast,
            present: newContent,
            future: [] // Clear future when new content is added
          };
        });
        lastContentRef.current = newContent;
      }
    }, 1000); // 1 second debounce
  }, []);

  const undo = useCallback(() => {
    setState(prevState => {
      if (prevState.past.length === 0) return prevState;

      const previous = prevState.past[prevState.past.length - 1];
      const newPast = prevState.past.slice(0, prevState.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [prevState.present, ...prevState.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prevState => {
      if (prevState.future.length === 0) return prevState;

      const next = prevState.future[0];
      const newFuture = prevState.future.slice(1);

      return {
        past: [...prevState.past, prevState.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setState(prevState => ({
      past: [],
      present: prevState.present,
      future: []
    }));
    lastContentRef.current = state.present;
  }, [state.present]);

  return {
    content: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    updateContent,
    undo,
    redo,
    clearHistory
  };
}