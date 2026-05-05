import { useEffect, useRef } from 'react';

/**
 * Global keyboard shortcuts.
 *
 * Singles:
 *  - Cmd/Ctrl + K  → onPaletteOpen()
 *  - Shift + ?     → onShortcutsOpen()
 *  - c             → window.dispatchEvent('shortcut:create')
 *
 * Combos (vim-style "g <x>", 1s timeout to chain):
 *  - g d → /dashboard
 *  - g m → /mindmap
 *  - g s → /bvs (score geral)
 *  - g p → /pillars/start
 *  - g r → /reports
 *  - g t → /touchpoints
 *
 * Skips when focus is in input/textarea/contentEditable
 * (except Cmd/Ctrl+K and Esc, which always pass through).
 */
const GO_TARGETS = {
  d: '/dashboard',
  m: '/mindmap',
  s: '/bvs',
  p: '/pillars/start',
  r: '/reports',
  t: '/touchpoints',
};

function isTextInput(el) {
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts({ onPaletteOpen, onShortcutsOpen, navigate }) {
  const goPendingRef = useRef(false);
  const goTimerRef = useRef(null);

  useEffect(() => {
    const clearGoPending = () => {
      goPendingRef.current = false;
      if (goTimerRef.current) {
        clearTimeout(goTimerRef.current);
        goTimerRef.current = null;
      }
    };

    const handler = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      const target = e.target;
      const inText = isTextInput(target);

      // Always allow Cmd/Ctrl+K (toggle palette)
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onPaletteOpen?.();
        return;
      }

      // Skip everything else when typing in inputs (Esc passes through to browser)
      if (inText) return;

      // Cheatsheet: Shift+? (which produces "?" on most layouts)
      if (e.key === '?' && !meta) {
        e.preventDefault();
        onShortcutsOpen?.();
        return;
      }

      // Sequential combo "g <x>"
      if (goPendingRef.current) {
        const target = GO_TARGETS[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          navigate?.(target);
        }
        clearGoPending();
        return;
      }

      if (e.key === 'g' && !meta && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        goPendingRef.current = true;
        goTimerRef.current = setTimeout(clearGoPending, 1000);
        return;
      }

      // Contextual create (single 'c')
      if (e.key === 'c' && !meta && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('shortcut:create'));
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (goTimerRef.current) clearTimeout(goTimerRef.current);
    };
  }, [onPaletteOpen, onShortcutsOpen, navigate]);
}

export default useKeyboardShortcuts;
