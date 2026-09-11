import React from 'react';
import { Keyboard, X, Search, PlusCircle, RefreshCw, FileText, Send, LayoutGrid, BarChart3, HelpCircle } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Navigation' | 'Actions' | 'Search & System';
}

const SHORTCUTS: ShortcutItem[] = [
  // Actions
  { keys: ['N'], description: 'Open Log Document modal (Incoming or Outgoing)', category: 'Actions' },
  { keys: ['S'], description: 'Open Google Sheets Integration & Live Diagnostics', category: 'Actions' },
  { keys: ['R'], description: 'Trigger immediate push / refresh with linked Google Sheet', category: 'Actions' },
  
  // Navigation
  { keys: ['1'], description: 'Switch to Dashboard tab', category: 'Navigation' },
  { keys: ['2'], description: 'Switch to Distribution Desk tab', category: 'Navigation' },
  { keys: ['3'], description: 'Switch to Analytics & Turnaround Dashboard', category: 'Navigation' },
  { keys: ['4'], description: 'Switch to System Admin Settings / Roles', category: 'Navigation' },

  // Search & System
  { keys: ['/', 'or', 'Ctrl', 'K'], description: 'Focus quick search across registry', category: 'Search & System' },
  { keys: ['Esc'], description: 'Close any open modal or dismiss focused overlay', category: 'Search & System' },
  { keys: ['?'], description: 'Open this Keyboard Shortcuts Reference guide', category: 'Search & System' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const categories: ('Actions' | 'Navigation' | 'Search & System')[] = ['Actions', 'Navigation', 'Search & System'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 ring-1 ring-slate-700 flex items-center justify-center text-slate-300">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Keyboard Shortcuts
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                  Global
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Speed up registry operations and navigation using your keyboard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {categories.map((cat) => {
            const items = SHORTCUTS.filter((s) => s.category === cat);
            return (
              <div key={cat} className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {cat}
                </h3>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2.5 flex items-center justify-between hover:bg-white dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {item.description}
                      </span>
                      <div className="flex items-center gap-1 shrink-0 ml-4">
                        {item.keys.map((k, kIdx) =>
                          k === 'or' ? (
                            <span key={kIdx} className="text-[10px] text-slate-400 px-0.5">
                              or
                            </span>
                          ) : (
                            <kbd
                              key={kIdx}
                              className="px-2 py-1 min-w-[24px] text-center text-[11px] font-mono font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs"
                            >
                              {k}
                            </kbd>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 text-[11px] text-blue-700 dark:text-blue-300 flex items-center justify-between">
            <span>Tip: Shortcuts work when you are not actively typing in an input field.</span>
            <kbd className="px-2 py-0.5 font-mono text-[10px] bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-800 rounded">
              ? anytime
            </kbd>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Press <kbd className="font-mono font-bold text-slate-700 dark:text-slate-300">Esc</kbd> to exit</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 font-semibold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
