import React, { useState } from 'react';
import { RealtimeNotification } from '../types';
import {
  Bell,
  CheckCheck,
  Check,
  X,
  FileText,
  ArrowRightLeft,
  MessageSquare,
  ShieldCheck,
  Activity,
  AlertTriangle,
} from 'lucide-react';

interface NotificationBellProps {
  notifications: RealtimeNotification[];
  onClearNotifications: () => void;
  onSelectDocument: (trackingNumber: string) => void;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
}

export const NotificationCenter: React.FC<NotificationBellProps> = ({
  notifications,
  onClearNotifications,
  onSelectDocument,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: RealtimeNotification['type']) => {
    switch (type) {
      case 'incoming':
        return <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      case 'movement':
        return <ArrowRightLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'remark':
        return <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'compliance':
        return <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'clearance':
        return <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'urgent':
        return <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'system':
      case 'sync':
      default:
        return <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      if (isNaN(date.getTime())) return ts;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
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
                {unreadCount > 0 && (
                  <span className="rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 px-2 py-0.5 text-[10px] font-bold">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && onMarkAllAsRead && (
                  <button
                    type="button"
                    onClick={() => onMarkAllAsRead()}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline cursor-pointer flex items-center gap-0.5"
                    title="Mark all as read"
                  >
                    <Check className="w-3 h-3" />
                    <span>Read all</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearNotifications}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:underline cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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
                notifications.map((n) => {
                  const isUnread = !n.read;
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (onMarkAsRead && isUnread) {
                          onMarkAsRead(n.id);
                        }
                        if (n.trackingNumber && n.trackingNumber !== 'POSSD-SYSTEM' && n.trackingNumber !== 'ROLE' && n.trackingNumber !== 'STAFF' && n.trackingNumber !== 'DROPDOWNS' && n.trackingNumber !== 'BATCH') {
                          onSelectDocument(n.trackingNumber);
                          setIsOpen(false);
                        }
                      }}
                      className={`flex gap-3 p-3 cursor-pointer transition-colors text-left group ${
                        isUnread
                          ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0 p-1.5 bg-white dark:bg-slate-800 rounded-md border border-slate-200/60 dark:border-slate-700 shadow-2xs">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 truncate">
                            {isUnread && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                            )}
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                              {n.trackingNumber}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                            {formatTimestamp(n.timestamp)}
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 truncate ${isUnread ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {n.message}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">By: {n.actor}</span>
                          {isUnread && onMarkAsRead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkAsRead(n.id);
                              }}
                              className="text-[10px] text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium hover:underline cursor-pointer"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
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
