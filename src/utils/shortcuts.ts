export interface ShortcutAction {
  key: string;
  description: string;
  modifier: 'cmd' | 'ctrl';
  action: () => void;
}

export function getModifierKey(): 'cmd' | 'ctrl' {
  return navigator.platform.toLowerCase().includes('mac') ? 'cmd' : 'ctrl';
}

export function formatShortcut(key: string, modifier: 'cmd' | 'ctrl'): string {
  const modifierSymbol = modifier === 'cmd' ? '⌘' : 'Ctrl';
  return `${modifierSymbol} + ${key.toUpperCase()}`;
}

export function handleShortcut(e: KeyboardEvent, shortcuts: ShortcutAction[]): void {
  const modifier = getModifierKey();
  const modifierPressed = modifier === 'cmd' ? e.metaKey : e.ctrlKey;
  
  if (!modifierPressed) return;

  shortcuts.forEach(shortcut => {
    if (e.key.toLowerCase() === shortcut.key.toLowerCase()) {
      e.preventDefault();
      shortcut.action();
    }
  });
} 
