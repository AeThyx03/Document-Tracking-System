import React, { useState } from 'react';
import { RealtimeNotification } from '../types';
import { Bell, CheckCheck, X, FileText, ArrowRightLeft, MessageSquare, ShieldCheck, CloudUpload } from 'lucide-react';

interface NotificationBellProps {
  notifications: RealtimeNotification[];
  onClearNotifications: () => void;
  onSelectDocument: (trackingNumber: string) => void;
}

export const NotificationCenter: React.FC<NotificationBellProps> = ({
  notifications,
  onClearNotifications,
  onSelectDocument,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: RealtimeNotification['type']) => {
    switch (type) {
      case 'incoming':
        return <FileText className="w-4 h-4 text-sky-600" />;
      case 'movement':
        return <ArrowRightLeft className="w-4 h-4 text-indigo-600" />;
      case 'remark':
        return <MessageSquare className="w-4 h-4 text-amber-600" />;
      case 'compliance':
        return <CheckCheck className="w-4 h-4 text-emerald-600" />;
      case 'clearance':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'sync':
        return <CloudUpload className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-blue-200 hover:text-white bg-[#102e52] hover:bg-[#163d6b] border border-[#204975] transition-colors focus:outline-none cursor-pointer shadow-2xs"
        title="Real-time document activity alerts"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-blue-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-950 ring-2 ring-[#0c2340]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span className="font-semibold text-sm text-slate-800 dark:text-white">Workflow Notifications</span>
                <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                  {notifications.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <button
                    onClick={onClearNotifications}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:underline px-2 py-1"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                  No notifications yet. Status changes and document movements will appear here live.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      onSelectDocument(n.trackingNumber);
                      setIsOpen(false);
                    }}
                    className="flex gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors text-left"
                  >
                    <div className="mt-0.5 shrink-0 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                          {n.trackingNumber}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate">{n.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">By: {n.actor}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 py-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
              Updates broadcast in real-time across your office workflow
            </div>
          </div>
        </>
      )}
    </div>
  );
};
