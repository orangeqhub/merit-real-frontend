import { useEffect } from "react";

interface UseKeyboardProps {
  onDelete?: () => void;
  onEscape?: () => void;
  onEnter?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export default function useKeyboard({ onDelete, onEscape, onEnter, onUndo, onRedo }: UseKeyboardProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) {
        return;
      }

      if (event.key === "Delete") {
        event.preventDefault();
        onDelete?.();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onEscape?.();
      }

      if (event.key === "Enter") {
        event.preventDefault();
        onEnter?.();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        onUndo?.();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        onRedo?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDelete, onEscape, onEnter, onUndo, onRedo]);
}
