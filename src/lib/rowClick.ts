import type { MouseEvent } from 'react';

// Call from a row's onClick. Ignores the click when the user was selecting
// text (so copy works) or when the click landed on an interactive element.
export function handleRowClick(e: MouseEvent, open: () => void) {
  if (window.getSelection()?.toString()) return;
  const el = e.target as HTMLElement;
  if (el.closest('button, a, input, select, textarea, [role="combobox"]')) return;
  open();
}
