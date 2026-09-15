/**
 * POSSD Office Document Tracker - Notification Engine
 * 
 * Manages real-time workflow notifications decoupled from document entities.
 * Supports persistent read/unread states, business-event dispatching,
 * and independent lifecycle management for future PostgreSQL notification tables.
 */

import { RealtimeNotification, DocumentItem } from '../types';
import { generateEntityId } from './workflow';
import { safeStorageGet, safeStorageSet } from '../mockData';

const NOTIFICATIONS_STORAGE_KEY = 'possd_notifications_v1';
const MAX_STORED_NOTIFICATIONS = 60;

/**
 * Loads stored notifications from isolated persistent storage.
 */
export function getStoredNotifications(): RealtimeNotification[] {
  try {
    const raw = safeStorageGet(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((n) => ({
        id: String(n.id || generateEntityId('notif')),
        timestamp: String(n.timestamp || new Date().toISOString()),
        documentId: n.documentId ? String(n.documentId) : undefined,
        trackingNumber: String(n.trackingNumber || 'POSSD-SYS'),
        title: String(n.title || 'Workflow Notice'),
        message: String(n.message || ''),
        actor: String(n.actor || 'System'),
        type: n.type || 'system',
        read: Boolean(n.read),
        readAt: n.readAt ? String(n.readAt) : undefined,
        createdAt: String(n.createdAt || n.timestamp || new Date().toISOString()),
      }));
    }
  } catch (err) {
    console.warn('[Notifications] Failed to parse notifications from storage:', err);
  }
  return [];
}

/**
 * Persists notifications to isolated storage.
 */
export function saveStoredNotifications(notifications: RealtimeNotification[]): void {
  try {
    const trimmed = (notifications || []).slice(0, MAX_STORED_NOTIFICATIONS);
    safeStorageSet(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('[Notifications] Failed to save notifications:', err);
  }
}

/**
 * Creates a strongly typed RealtimeNotification tied directly to a business workflow event.
 */
export function createBusinessNotification(params: {
  title: string;
  message: string;
  actor: string;
  type: RealtimeNotification['type'];
  trackingNumber?: string;
  documentId?: string;
}): RealtimeNotification {
  const nowIso = new Date().toISOString();
  return {
    id: generateEntityId('notif'),
    timestamp: nowIso,
    documentId: params.documentId,
    trackingNumber: params.trackingNumber || 'POSSD-SYSTEM',
    title: params.title.trim(),
    message: params.message.trim(),
    actor: params.actor.trim() || 'System',
    type: params.type,
    read: false,
    createdAt: nowIso,
  };
}

/**
 * Marks a specific notification as read.
 */
export function markNotificationAsRead(
  notifications: RealtimeNotification[],
  notificationId: string
): RealtimeNotification[] {
  const nowIso = new Date().toISOString();
  return notifications.map((n) => {
    if (n.id === notificationId) {
      return {
        ...n,
        read: true,
        readAt: nowIso,
      };
    }
    return n;
  });
}

/**
 * Marks all notifications as read.
 */
export function markAllNotificationsAsRead(
  notifications: RealtimeNotification[]
): RealtimeNotification[] {
  const nowIso = new Date().toISOString();
  return notifications.map((n) => ({
    ...n,
    read: true,
    readAt: n.readAt || nowIso,
  }));
}

/**
 * Deletes a single notification by ID.
 */
export function deleteNotification(
  notifications: RealtimeNotification[],
  notificationId: string
): RealtimeNotification[] {
  return notifications.filter((n) => n.id !== notificationId);
}

/**
 * Returns count of unread notifications.
 */
export function getUnreadNotificationCount(notifications: RealtimeNotification[]): number {
  if (!notifications || !Array.isArray(notifications)) return 0;
  return notifications.filter((n) => !n.read).length;
}
