import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DocumentItem,
  RealtimeNotification,
  AppUserRole,
  UserRoleType,
  RegistryDropdownOptions,
  TimeInDeskConfig,
  DedicatedLinkItem,
} from './types';
import {
  getStoredDocuments,
  saveStoredDocuments,
  getStoredSheetConfig,
  saveStoredSheetConfig,
  getStoredStaffMembers,
  saveStoredStaffMembers,
  getStoredDropdownOptions,
  saveStoredDropdownOptions,
  ROLE_CONFIGS,
  getRoleConfig,
  canUserDeleteDocuments,
  decodePersonnelSyncCode,
  broadcastDataUpdate,
  onDataUpdate,
  safeStorageGet,
  safeStorageSet,
  safeStorageRemove,
} from './mockData';
import {
  SheetMetadata,
  syncAllDocumentsToSheet,
  syncPersonnelOnlyToSheet,
  pullPersonnelFromSheet,
  pullAllFromSheet,
  isGoogleQuotaError,
} from './lib/googleSheets';
import { initAuth, setAccessToken, getAccessToken, googleSignIn, logoutGoogle, getStaySignedIn } from './lib/firebase';
import { User } from 'firebase/auth';
import { NotificationCenter } from './components/NotificationCenter';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { IncomingDocumentModal } from './components/IncomingDocumentModal';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { RolesManagementModal } from './components/RolesManagementModal';
import { TimeInDeskConfigModal } from './components/TimeInDeskConfigModal';
import { DocumentAnalyticsDashboard } from './components/DocumentAnalyticsDashboard';
import { LoginModal } from './components/LoginModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { DedicatedLinksView } from './components/DedicatedLinksView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { PossdLogo } from './components/PossdLogo';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentLifecycleProgress } from './components/DocumentLifecycleProgress';
import { VerticalNavigationSidebar, WorkspaceTab } from './components/VerticalNavigationSidebar';
import {
  getTimeInDeskConfig,
  saveTimeInDeskConfig,
  calculateDocumentTimeInDesk,
} from './lib/timeInDesk';
import {
  FileText,
  PlusCircle,
  FileSpreadsheet,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Clock,
  Send,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Users,
  MapPin,
  ChevronRight,
  TrendingUp,
  Inbox,
  SendHorizontal,
  RefreshCw,
  SlidersHorizontal,
  UserCog,
  Briefcase,
  Trash2,
  AlertTriangle,
  Lock,
  X,
  Timer,
  Sliders,
  BarChart3,
  Link2,
  Sun,
  Moon,
  LogIn,
  LogOut,
  Globe,
  Keyboard,
} from 'lucide-react';

export default function App() {
  // Theme Toggle State ('light' | 'dark')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('possd_theme');
        if (saved === 'dark' || saved === 'light') return saved;
      }
    } catch (e) {
      // Sandboxed iframe
    }
    return 'dark';
  });

  useEffect(() => {
    try {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('possd_theme', theme);
      }
    } catch (e) {
      // Sandboxed iframe
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Authentication & Google Sheets State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sheetConfig, setSheetConfig] = useState<SheetMetadata | null>(null);
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);
  const [isPushingAll, setIsPushingAll] = useState<boolean>(false);
  const [quotaCooldownSeconds, setQuotaCooldownSeconds] = useState<number>(0);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);

  // References to prevent quota over-consumption and circuit-breaker for rate limits
  const quotaCooldownUntilRef = useRef<number>(0);
  const pushTimeoutRef = useRef<any>(null);

  // Time-in-Desk Threshold Configuration State
  const [timeInDeskConfig, setTimeInDeskConfig] = useState<TimeInDeskConfig>(() =>
    getTimeInDeskConfig()
  );
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);

  // Staff & Roles State
  const [staffList, setStaffList] = useState<AppUserRole[]>(() => getStoredStaffMembers());
  const [currentUser, setCurrentUser] = useState<AppUserRole>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('possd_active_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.name && parsed.role) {
            return parsed;
          }
        }
      }
    } catch (e) {
      // ignore
    }
    const initialStaff = getStoredStaffMembers();
    return initialStaff[0] || {
      id: 'SYS-ADMIN-1',
      name: 'Engr. System Admin',
      role: 'System Admin',
      division: 'Administrative Section',
      username: 'admin',
    };
  });
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState<RegistryDropdownOptions>(() => getStoredDropdownOptions());

  // Dedicated Institutional Links State (Google Drives, Files, External Portals)
  const [dedicatedLinks, setDedicatedLinks] = useState<DedicatedLinkItem[]>(() => {
    try {
      const stored = localStorage.getItem('possd_dedicated_links');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'link-drive-master',
        title: 'POSSD Master Google Drive Repository',
        url: 'https://drive.google.com',
        category: 'Google Drive',
        description: 'Central cloud drive repository for division folders, digital copies, and clearance attachments.',
        targetDivision: 'All Divisions',
        iconType: 'drive',
        addedBy: 'System Admin',
        addedAt: new Date().toISOString(),
        isPinned: true,
      },
      {
        id: 'link-routing-template',
        title: 'Standard Internal Routing Slip Template',
        url: 'https://docs.google.com/spreadsheets',
        category: 'Official Files',
        description: 'Prescribed routing slip sheet for tracking multi-desk document transmittals and compliance.',
        targetDivision: 'All Divisions',
        iconType: 'sheet',
        addedBy: 'System Admin',
        addedAt: new Date().toISOString(),
        isPinned: true,
      },
      {
        id: 'link-philpost-portal',
        title: 'Philippine Postal Corporation Portal',
        url: 'https://www.phlpost.gov.ph',
        category: 'Portals & Systems',
        description: 'Official PHLPost institutional corporate portal and administrative circulars directory.',
        targetDivision: 'Administrative Section',
        iconType: 'link',
        addedBy: 'System Admin',
        addedAt: new Date().toISOString(),
        isPinned: false,
      },
      {
        id: 'link-sla-manual',
        title: 'Document Turnaround & SLA Threshold Handbook',
        url: 'https://drive.google.com',
        category: 'Reference Guidelines',
        description: 'Operating reference guide on time-in-desk limits, urgent transactions, and focal routing.',
        targetDivision: 'All Divisions',
        iconType: 'file',
        addedBy: 'System Admin',
        addedAt: new Date().toISOString(),
        isPinned: false,
      },
    ];
  });

  // Fetch dedicated links from server on mount
  useEffect(() => {
    fetch('/api/links')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.links) && data.links.length > 0) {
          setDedicatedLinks(data.links);
          try {
            localStorage.setItem('possd_dedicated_links', JSON.stringify(data.links));
          } catch {}
        }
      })
      .catch((err) => console.warn('Could not fetch server links:', err));
  }, []);

  const handleAddDedicatedLink = (newLink: Omit<DedicatedLinkItem, 'id' | 'addedAt'>) => {
    const linkItem: DedicatedLinkItem = {
      ...newLink,
      id: `link-${Date.now()}`,
      addedAt: new Date().toISOString(),
    };
    const updated = [linkItem, ...dedicatedLinks];
    setDedicatedLinks(updated);
    try {
      localStorage.setItem('possd_dedicated_links', JSON.stringify(updated));
    } catch {}
    fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: updated }),
    }).catch((e) => console.warn('Failed to push link to server:', e));

    addNotification(
      'Resource Link Added',
      `System Admin registered "${linkItem.title}" to dedicated links directory.`,
      currentUser?.name || 'System Admin',
      'incoming',
      'LINK-NEW'
    );
  };

  const handleUpdateDedicatedLink = (id: string, updates: Partial<DedicatedLinkItem>) => {
    const updated = dedicatedLinks.map((l) => (l.id === id ? { ...l, ...updates } : l));
    setDedicatedLinks(updated);
    try {
      localStorage.setItem('possd_dedicated_links', JSON.stringify(updated));
    } catch {}
    fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: updated }),
    }).catch((e) => console.warn('Failed to push link to server:', e));
  };

  const handleDeleteDedicatedLink = (id: string) => {
    const updated = dedicatedLinks.filter((l) => l.id !== id);
    setDedicatedLinks(updated);
    try {
      localStorage.setItem('possd_dedicated_links', JSON.stringify(updated));
    } catch {}
    fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: updated }),
    }).catch((e) => console.warn('Failed to push link to server:', e));
  };

  // Documents State
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notifications State (Real-time activity log)
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [divisionFilter, setDivisionFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'all' | 'incoming' | 'outgoing' | 'compliance_needed' | 'overdue'>('all');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('documents');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Table Column Sorting State
  const [sortField, setSortField] = useState<
    'trackingNumber' | 'title' | 'dateReceived' | 'targetDivision' | 'currentCustodian' | 'timeInDesk' | 'lifecycle'
  >('dateReceived');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // For dates, elapsed time, and status, default to desc; for text codes, default to asc
      if (field === 'dateReceived' || field === 'timeInDesk' || field === 'lifecycle') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  // Refs for background sync interval
  const documentsRef = useRef<DocumentItem[]>(documents);
  const staffListRef = useRef<AppUserRole[]>(staffList);

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    staffListRef.current = staffList;
  }, [staffList]);

  const hasPendingSyncRef = useRef<boolean>(
    safeStorageGet('possd_has_unpushed_changes') === 'true'
  );

  // Debounced push queue to batch rapid mutations and protect against Google Sheets write quota exhaustion (60 writes/min)
  // Guarantees that any added log (incoming document, desk routing, remark, clearance) is preserved locally and synced to the sheet.
  const scheduleSheetPush = (updatedDocs: DocumentItem[], updatedStaff?: AppUserRole[]) => {
    hasPendingSyncRef.current = true;
    safeStorageSet('possd_has_unpushed_changes', 'true');

    if ((!token && !sheetConfig?.appsScriptUrl) || !sheetConfig?.spreadsheetId) {
      console.log('Sync queued: Changes saved locally and will auto-push to Google Sheet once connected or Apps Script configured.');
      return;
    }

    if (pushTimeoutRef.current) {
      clearTimeout(pushTimeoutRef.current);
    }

    const now = Date.now();
    const waitTime = Math.max(0, quotaCooldownUntilRef.current - now);
    const delay = waitTime > 0 ? waitTime + 1000 : 1200;

    pushTimeoutRef.current = setTimeout(async () => {
      setIsAutoSyncing(true);
      try {
        await syncAllDocumentsToSheet(
          token,
          sheetConfig.spreadsheetId,
          updatedDocs,
          updatedStaff || staffListRef.current,
          { appsScriptUrl: sheetConfig.appsScriptUrl }
        );
        hasPendingSyncRef.current = false;
        safeStorageRemove('possd_has_unpushed_changes');
      } catch (err: any) {
        if (isGoogleQuotaError(err)) {
          const cooldownMs = 65_000;
          quotaCooldownUntilRef.current = Date.now() + cooldownMs;
          setQuotaCooldownSeconds(65);
          addNotification(
            'Sync Quota Cooldown',
            'Google Sheets write limit reached (60/min). Your added logs are safely preserved locally and will automatically sync once the window resets.',
            'System Sync',
            'sync',
            'QUOTA'
          );
          // Automatically re-schedule push after cooldown so the added log is never dropped!
          scheduleSheetPush(updatedDocs, updatedStaff);
        } else {
          console.error('Failed to sync changes to Google Sheet:', err);
        }
      } finally {
        setIsAutoSyncing(false);
      }
    }, delay);
  };

  // When sheet credentials / connection become active, automatically flush any un-synced logs
  useEffect(() => {
    if ((!token && !sheetConfig?.appsScriptUrl) || !sheetConfig?.spreadsheetId) return;
    if (hasPendingSyncRef.current || safeStorageGet('possd_has_unpushed_changes') === 'true') {
      scheduleSheetPush(documentsRef.current, staffListRef.current);
    }
  }, [token, sheetConfig]);

  // Background Auto-Sync: 30-second read-only polling to observe remote changes without consuming write quota
  // Supports zero-login public sheets via GViz proxy as well as OAuth sessions
  useEffect(() => {
    if (!sheetConfig?.spreadsheetId) return;

    let isSyncing = false;

    const performAutoPull = async () => {
      // If currently cooling down from HTTP 429 quota, skip polling
      if (Date.now() < quotaCooldownUntilRef.current) {
        return;
      }

      if (isSyncing) return;
      isSyncing = true;
      setIsAutoSyncing(true);

      try {
        // Read-only pull — safely merges with local documents and movements
        const { documents: pulledDocs, personnel: pulledStaff } = await pullAllFromSheet(
          token,
          sheetConfig.spreadsheetId,
          documentsRef.current,
          staffListRef.current
        );

        // Detect if anything actually changed before re-rendering
        const currentDocs = documentsRef.current;
        const docsChanged =
          pulledDocs.length !== currentDocs.length ||
          pulledDocs.some((d, i) => {
            const existing = currentDocs[i];
            return (
              !existing ||
              existing.id !== d.id ||
              existing.currentStatus !== d.currentStatus ||
              existing.currentLocation !== d.currentLocation ||
              existing.currentCustodian !== d.currentCustodian ||
              (existing.movements?.length || 0) !== (d.movements?.length || 0) ||
              (existing.supervisorRemarks?.length || 0) !== (d.supervisorRemarks?.length || 0) ||
              existing.managerClearance?.isCleared !== d.managerClearance?.isCleared ||
              existing.updatedAt !== d.updatedAt
            );
          });

        if (docsChanged) {
          setDocuments(pulledDocs);
          saveStoredDocuments(pulledDocs);
        }

        const currentStaff = staffListRef.current;
        const staffChanged =
          pulledStaff.length !== currentStaff.length ||
          pulledStaff.some((s, i) => {
            const existing = currentStaff[i];
            return (
              !existing ||
              existing.id !== s.id ||
              existing.role !== s.role ||
              existing.division !== s.division ||
              existing.status !== s.status
            );
          });

        if (staffChanged) {
          setStaffList(pulledStaff);
          saveStoredStaffMembers(pulledStaff);
        }

        // If local had unsynced logs before or during auto-pull, push the merged state back to the sheet!
        if (hasPendingSyncRef.current) {
          scheduleSheetPush(pulledDocs, staffListRef.current);
        }
      } catch (err: any) {
        if (isGoogleQuotaError(err)) {
          const cooldownMs = 65_000;
          quotaCooldownUntilRef.current = Date.now() + cooldownMs;
          setQuotaCooldownSeconds(65);
          console.warn('Google Sheets API rate limit reached. Auto-sync is paused for 65 seconds.');
        } else {
          console.warn('Auto-sync pull failed:', err);
        }
      } finally {
        isSyncing = false;
        setIsAutoSyncing(false);
      }
    };

    // Initial pull after 2s, then every 30s
    const initialTimer = setTimeout(performAutoPull, 2000);
    const interval = setInterval(performAutoPull, 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [token, sheetConfig]);

  // Quota cooldown countdown ticker
  useEffect(() => {
    if (quotaCooldownSeconds <= 0) return;
    const ticker = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((quotaCooldownUntilRef.current - Date.now()) / 1000));
      setQuotaCooldownSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(ticker);
      }
    }, 1000);
    return () => clearInterval(ticker);
  }, [quotaCooldownSeconds]);

  // Sign Out / Logout handler - Turns back to Official Portal Login Page
  const handleLogout = async () => {
    try {
      await logoutGoogle();
    } catch (e) {
      console.warn('Google logout warning:', e);
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('possd_active_user');
      }
    } catch (e) {}
    setUser(null);
    setToken(null);
    setAccessToken(null);
    fetch('/api/sheet-auth-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: null }),
    }).catch(() => {});
    setCurrentUser(null);
    setIsLoginModalOpen(false);
  };

  // Manual Instant Refresh Handler
  const handleManualSync = async () => {
    if (!sheetConfig?.spreadsheetId) {
      setIsSheetModalOpen(true);
      return;
    }

    if (Date.now() < quotaCooldownUntilRef.current) {
      const remaining = Math.max(1, Math.ceil((quotaCooldownUntilRef.current - Date.now()) / 1000));
      addNotification(
        'Sync Cooling Down',
        `Google Sheets API quota is resetting. Please wait ${remaining}s before manual sync.`,
        'System Sync',
        'sync',
        'COOLDOWN'
      );
      return;
    }

    setIsAutoSyncing(true);
    try {
      const { documents: pulledDocs, personnel: pulledStaff } = await pullAllFromSheet(
        token,
        sheetConfig.spreadsheetId,
        documentsRef.current,
        staffListRef.current
      );
      setDocuments(pulledDocs);
      saveStoredDocuments(pulledDocs);
      setStaffList(pulledStaff);
      saveStoredStaffMembers(pulledStaff);

      addNotification(
        'Google Sheet Synchronized',
        `Refreshed ${pulledDocs.length} documents and ${pulledStaff.length} personnel profiles from Google Sheet.`,
        'System Sync',
        'sync',
        'MANUAL-SYNC'
      );
    } catch (err: any) {
      if (isGoogleQuotaError(err)) {
        quotaCooldownUntilRef.current = Date.now() + 65_000;
        setQuotaCooldownSeconds(65);
      }
      console.error('Manual sync failed:', err);
    } finally {
      setIsAutoSyncing(false);
    }
  };

  // Dedicated Force Push All Handler for Top Ribbon & Manual Action
  const handlePushAllNow = async () => {
    if (!sheetConfig?.spreadsheetId) {
      setIsSheetModalOpen(true);
      return;
    }

    let activeToken = token;
    // If no active token, check if Apps Script URL is set or server has shared token
    if (!activeToken && !sheetConfig.appsScriptUrl) {
      try {
        const tokenRes = await fetch('/api/sheet-auth-token').then((r) => r.json());
        if (tokenRes.success && tokenRes.token) {
          activeToken = tokenRes.token;
          setToken(tokenRes.token);
          setAccessToken(tokenRes.token);
        }
      } catch {}
    }

    setIsPushingAll(true);
    try {
      const res = await syncAllDocumentsToSheet(
        activeToken,
        sheetConfig.spreadsheetId,
        documentsRef.current,
        staffListRef.current,
        { forceHeaders: true, appsScriptUrl: sheetConfig.appsScriptUrl }
      );

      hasPendingSyncRef.current = false;
      safeStorageRemove('possd_has_unpushed_changes');

      // Update URL with direct gid tab link if not present
      if (res.masterSheetId !== undefined && !sheetConfig.spreadsheetUrl.includes('#gid=')) {
        const updatedConfig: SheetMetadata = {
          ...sheetConfig,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit#gid=${res.masterSheetId}`,
          sheetName: res.masterTabName,
        };
        setSheetConfig(updatedConfig);
        saveStoredSheetConfig(updatedConfig);
      }

      addNotification(
        'Google Sheet Synchronized',
        `Successfully logged ${res.rowsUpdated} document records and ${res.personnelUpdated} personnel profiles to tab "${res.masterTabName}".`,
        currentUser.name,
        'sync',
        'PUSH-ALL-SUCCESS'
      );
    } catch (err: any) {
      if (isGoogleQuotaError(err)) {
        quotaCooldownUntilRef.current = Date.now() + 65_000;
        setQuotaCooldownSeconds(65);
        addNotification(
          'Sync Quota Cooldown',
          'Google Sheets write quota (60/min) reached. Your entries are safely preserved locally and will sync once the window resets.',
          'System Sync',
          'sync',
          'QUOTA'
        );
      } else {
        console.error('Failed to push all records to Google Sheet:', err);
        addNotification(
          'Sync Failed',
          err?.message || 'Failed to push all entries to Google Sheet. Check permissions or network.',
          'System Sync',
          'sync',
          'SYNC-FAILED'
        );
        setIsSheetModalOpen(true);
      }
    } finally {
      setIsPushingAll(false);
    }
  };

  const handleSaveThresholdConfig = (updated: TimeInDeskConfig) => {
    setTimeInDeskConfig(updated);
    saveTimeInDeskConfig(updated);
    addNotification(
      'Thresholds Updated',
      `Time-in-desk baseline updated to ${updated.defaultThresholdHours}h with ${Object.keys(updated.divisionThresholds).length} division rules.`,
      currentUser.name,
      'movement',
      'THRESH-UPDATE'
    );
  };

  // Load initial data & Firebase Auth Listener
  useEffect(() => {
    const localDocs = getStoredDocuments();
    setDocuments(localDocs);
    const existingConfig = getStoredSheetConfig();
    setSheetConfig(existingConfig);

    // Cross-Device Backend Hydration
    fetch('/api/sheet-config')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.sheetConfig) {
          setSheetConfig((prev) => prev || data.sheetConfig);
          if (!existingConfig) {
            saveStoredSheetConfig(data.sheetConfig);
          }
        }
      })
      .catch(() => {});

    fetch('/api/documents')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.documents) && data.documents.length > 0) {
          if (localDocs.length === 0) {
            setDocuments(data.documents);
            saveStoredDocuments(data.documents);
          }
        }
      })
      .catch(() => {});

    fetch('/api/staff')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.staff) && data.staff.length > 0) {
          setStaffList((prev) => (prev.length === 0 ? data.staff : prev));
        }
      })
      .catch(() => {});

    fetch('/api/sheet-auth-token')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.token) {
          setToken((prev) => prev || data.token);
          setAccessToken(data.token);
        }
      })
      .catch(() => {});

    // Cross-Device Instant Sync URL & Hash Detection
    try {
      const hash = window.location.hash || '';
      const params = new URLSearchParams(window.location.search);
      let syncRaw = '';

      if (hash.startsWith('#sync_staff=')) {
        syncRaw = hash.replace('#sync_staff=', '');
      } else if (hash.startsWith('#sync=')) {
        syncRaw = hash.replace('#sync=', '');
      } else if (params.has('sync_staff')) {
        syncRaw = params.get('sync_staff') || '';
      } else if (params.has('sync_code')) {
        syncRaw = params.get('sync_code') || '';
      }

      if (syncRaw) {
        const payload = decodePersonnelSyncCode(syncRaw);
        if (payload && Array.isArray(payload.staff) && payload.staff.length > 0) {
          const currentStaff = getStoredStaffMembers();
          // Merge staff prioritizing payload
          const staffMap = new Map<string, AppUserRole>();
          currentStaff.forEach((s) => staffMap.set(s.id, s));
          payload.staff.forEach((s) => staffMap.set(s.id, s));
          const mergedStaff = Array.from(staffMap.values());

          setStaffList(mergedStaff);
          saveStoredStaffMembers(mergedStaff);

          if (payload.dropdownOptions) {
            setDropdownOptions(payload.dropdownOptions);
            saveStoredDropdownOptions(payload.dropdownOptions);
          }

          if (payload.sheetConfig && !existingConfig) {
            setSheetConfig(payload.sheetConfig);
            saveStoredSheetConfig(payload.sheetConfig);
          }

          // Clean URL so the token is not exposed in address bar
          window.history.replaceState(null, '', window.location.pathname);

          setTimeout(() => {
            addNotification(
              'Multi-Device Sync Applied',
              `Successfully loaded ${payload.staff.length} personnel profiles and credentials from device transfer link.`,
              'System',
              'sync',
              'DEVICE-SYNC'
            );
          }, 600);
        }
      }

      // Check ?sheet=<spreadsheetId> parameter for fast sheet linking across devices
      const sheetParam = params.get('sheet');
      if (sheetParam && (!existingConfig || existingConfig.spreadsheetId !== sheetParam)) {
        const newSheetCfg: SheetMetadata = {
          spreadsheetId: sheetParam,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetParam}/edit`,
          title: 'POSSD Document Tracking & Personnel Directory',
          linkedAt: new Date().toISOString(),
        };
        setSheetConfig(newSheetCfg);
        saveStoredSheetConfig(newSheetCfg);
        setTimeout(() => {
          addNotification(
            'Google Sheet Linked',
            `Linked to Google Sheet ID: ${sheetParam}`,
            'System',
            'sync',
            'SHEET-AUTO-CONNECT'
          );
        }, 800);
      }
    } catch (e) {
      console.warn('Could not parse multi-device sync params', e);
    }

    // Cross-Tab Broadcast Channel listener
    const cleanupBroadcast = onDataUpdate((type, data) => {
      if (type === 'staff' && Array.isArray(data)) {
        setStaffList(data);
      } else if (type === 'documents' && Array.isArray(data)) {
        setDocuments(data);
      } else if (type === 'dropdowns' && data) {
        setDropdownOptions(data);
      }
    });

    const unsubscribe = initAuth(
      (authedUser, oauthToken) => {
        setUser(authedUser);
        setToken(oauthToken);
        setAccessToken(oauthToken);
        if (oauthToken) {
          fetch('/api/sheet-auth-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: oauthToken }),
          }).catch(() => {});
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setAccessToken(null);
        fetch('/api/sheet-auth-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: null }),
        }).catch(() => {});
      }
    );

    return () => {
      unsubscribe();
      cleanupBroadcast();
    };
  }, []);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keybindings if the user is typing in any form input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      // Escape always closes any currently active overlay/modal
      if (e.key === 'Escape') {
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
          return;
        }
        if (selectedDoc) {
          setSelectedDoc(null);
          return;
        }
        if (isIncomingModalOpen) {
          setIsIncomingModalOpen(false);
          return;
        }
        if (isSheetModalOpen) {
          setIsSheetModalOpen(false);
          return;
        }
        if (isRolesModalOpen) {
          setIsRolesModalOpen(false);
          return;
        }
        if (isLoginModalOpen) {
          setIsLoginModalOpen(false);
          return;
        }
        if (isThresholdModalOpen) {
          setIsThresholdModalOpen(false);
          return;
        }
        if (docToDelete) {
          setDocToDelete(null);
          return;
        }
        return;
      }

      // Quick Search shortcut: '/' or Ctrl+K / Cmd+K
      if ((e.key === '/' && !isInputFocused) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        const searchInput =
          (document.getElementById('document-search-input') as HTMLInputElement) ||
          (document.getElementById('registry-search-input') as HTMLInputElement);
        if (searchInput) {
          searchInput.focus();
          searchInput.select?.();
        }
        return;
      }

      // If typing inside an input/textarea/select, do not trigger single-key action shortcuts
      if (isInputFocused) {
        return;
      }

      // Open Shortcuts Guide: '?' or Shift+'/'
      if (e.key === '?' || (e.shiftKey && e.key === '?')) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // Action: Log Document ('n' or 'N')
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setIsIncomingModalOpen(true);
        return;
      }

      // Action: Google Sheets Integration & Diagnostics ('s' or 'S')
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsSheetModalOpen(true);
        return;
      }

      // Action: Refresh / Manual Sync ('r' or 'R')
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleManualSync();
        return;
      }

      // Navigation tabs: '1' for Registry, '2' for Distribution Desk, '3' for Analytics, '4' for Roles
      if (e.key === '1') {
        e.preventDefault();
        setActiveTab('documents');
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        setActiveTab('distribution');
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        setActiveTab('analytics');
        return;
      }
      if (e.key === '4') {
        e.preventDefault();
        setIsRolesModalOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isShortcutsModalOpen,
    selectedDoc,
    isIncomingModalOpen,
    isSheetModalOpen,
    isRolesModalOpen,
    isLoginModalOpen,
    isThresholdModalOpen,
    docToDelete,
    handleManualSync,
  ]);

  // Real-time notification helper
  const addNotification = (
    title: string,
    message: string,
    performedBy: string,
    type: 'incoming' | 'movement' | 'remark' | 'compliance' | 'clearance' | 'sync',
    trackingNumber: string
  ) => {
    const newNotif: RealtimeNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title,
      message,
      actor: performedBy,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      trackingNumber,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);
  };

  // Quick switch role
  const handleQuickSwitchRole = (role: UserRoleType) => {
    const match = staffList.find((s) => s.role === role);
    if (match) {
      setCurrentUser(match);
      addNotification('Role Switched', `Switched active perspective to ${match.name} (${role})`, match.name, 'movement', 'ROLE');
    } else {
      const updated: AppUserRole = {
        ...currentUser,
        role,
      };
      setCurrentUser(updated);
    }
  };

  // Staff list management handlers
  const handleAddStaffMember = (newStaff: AppUserRole) => {
    const updated = [...staffList, newStaff];
    setStaffList(updated);
    saveStoredStaffMembers(updated);
    broadcastDataUpdate('staff', updated);

    // Auto-sync to Google Sheet if connected (debounced to avoid rate limits)
    if (token && sheetConfig) {
      scheduleSheetPush(documents, updated);
    }

    addNotification(
      'Staff Enrolled',
      `Registered ${newStaff.name} as ${newStaff.role} (${newStaff.division})`,
      currentUser.name,
      'sync',
      'STAFF'
    );
  };

  const handleUpdateStaffRole = (staffId: string, newRole: UserRoleType, newDivision?: string) => {
    const updated = staffList.map((s) => {
      if (s.id === staffId) {
        return {
          ...s,
          role: newRole,
          ...(newDivision ? { division: newDivision } : {}),
        };
      }
      return s;
    });
    setStaffList(updated);
    saveStoredStaffMembers(updated);
    broadcastDataUpdate('staff', updated);

    if (token && sheetConfig) {
      scheduleSheetPush(documents, updated);
    }

    if (currentUser.id === staffId) {
      setCurrentUser((prev) => ({
        ...prev,
        role: newRole,
        ...(newDivision ? { division: newDivision } : {}),
      }));
    }

    addNotification(
      'Role Updated',
      `Updated role permission for staff ${staffId} to ${newRole}`,
      currentUser.name,
      'sync',
      'ROLE'
    );
  };

  const handleUpdateStaffCredentials = (
    staffId: string,
    updates: { username?: string; password?: string; status?: 'active' | 'suspended' }
  ) => {
    const updated = staffList.map((s) => {
      if (s.id === staffId) {
        return {
          ...s,
          ...updates,
        };
      }
      return s;
    });
    setStaffList(updated);
    saveStoredStaffMembers(updated);
    broadcastDataUpdate('staff', updated);

    if (token && sheetConfig) {
      scheduleSheetPush(documents, updated);
    }

    if (currentUser.id === staffId) {
      setCurrentUser((prev) => ({
        ...prev,
        ...updates,
      }));
    }

    addNotification(
      'Credentials Enrolled',
      `Admin updated portal login credentials for personnel ID ${staffId}.`,
      currentUser.name,
      'sync',
      staffId
    );
  };

  const handleDeleteStaffMember = (staffId: string) => {
    const updated = staffList.filter((s) => s.id !== staffId);
    setStaffList(updated);
    saveStoredStaffMembers(updated);
    broadcastDataUpdate('staff', updated);

    if (token && sheetConfig) {
      scheduleSheetPush(documents, updated);
    }

    addNotification('Staff Removed', `Removed personnel ID ${staffId}`, currentUser.name, 'sync', 'STAFF');
  };

  const handleUpdateDropdownOptions = (updatedOptions: RegistryDropdownOptions) => {
    setDropdownOptions(updatedOptions);
    saveStoredDropdownOptions(updatedOptions);
    broadcastDataUpdate('dropdowns', updatedOptions);
    addNotification('Options Updated', 'Custom dropdown values updated', currentUser.name, 'sync', 'DROPDOWNS');
  };

  // HANDLER: Create New Incoming Document
  const handleCreateDocument = async (newDoc: DocumentItem) => {
    const updatedList = [newDoc, ...documents];
    setDocuments(updatedList);
    saveStoredDocuments(updatedList);
    setIsIncomingModalOpen(false);

    addNotification(
      'Document Inflow Registered',
      `${newDoc.trackingNumber}: "${newDoc.title}" received from ${newDoc.originDepartment}`,
      currentUser.name,
      'incoming',
      newDoc.trackingNumber
    );

    // Always schedule sheet push (will save locally and queue for push when sheet is linked)
    scheduleSheetPush(updatedList, staffList);
  };

  // HANDLER: Update Document
  const handleUpdateDocument = async (updatedDoc: DocumentItem) => {
    const updatedList = documents.map((d) => (d.id === updatedDoc.id ? updatedDoc : d));
    setDocuments(updatedList);
    saveStoredDocuments(updatedList);
    setSelectedDoc(updatedDoc);

    const oldDoc = documents.find((d) => d.id === updatedDoc.id);

    if (oldDoc && oldDoc.currentLocation !== updatedDoc.currentLocation) {
      addNotification(
        'Document Routed',
        `${updatedDoc.trackingNumber} transferred to ${updatedDoc.currentLocation} (Custodian: ${updatedDoc.currentCustodian})`,
        currentUser.name,
        'movement',
        updatedDoc.trackingNumber
      );
    } else if (
      oldDoc &&
      (!oldDoc.supervisorRemarks || oldDoc.supervisorRemarks.length < (updatedDoc.supervisorRemarks?.length || 0))
    ) {
      const latestRemark = updatedDoc.supervisorRemarks?.[updatedDoc.supervisorRemarks.length - 1];
      addNotification(
        'Supervisor Remark Added',
        `${updatedDoc.trackingNumber}: ${latestRemark?.supervisorName} added directive ("${latestRemark?.remarkText}")`,
        currentUser.name,
        'remark',
        updatedDoc.trackingNumber
      );
    } else if (
      oldDoc &&
      !oldDoc.managerClearance?.isCleared &&
      updatedDoc.managerClearance?.isCleared
    ) {
      addNotification(
        'Manager Clearance Approved',
        `${updatedDoc.trackingNumber} cleared for Outgoing Dispatch by ${updatedDoc.managerClearance.clearedBy || currentUser.name}`,
        currentUser.name,
        'clearance',
        updatedDoc.trackingNumber
      );
    } else if (
      oldDoc &&
      oldDoc.supervisorRemarks?.some((r) => !r.complied) &&
      updatedDoc.supervisorRemarks?.every((r) => !r.complianceRequired || r.complied)
    ) {
      addNotification(
        'Compliance Verified',
        `${updatedDoc.trackingNumber}: Staff verified all supervisor requirements fulfilled`,
        currentUser.name,
        'compliance',
        updatedDoc.trackingNumber
      );
    }

    // Always schedule sheet push (will save locally and queue for push when sheet is linked)
    scheduleSheetPush(updatedList, staffList);
  };

  // HANDLER: Delete document entry (only for System Admins and Department Manager)
  const handleDeleteDocument = async (doc: DocumentItem) => {
    if (!canUserDeleteDocuments(currentUser.role)) {
      addNotification(
        'Action Restricted',
        'Deleting entries from incoming and outgoing logs is strictly restricted to System Admins and Department Managers.',
        currentUser.name,
        'sync',
        doc.trackingNumber
      );
      return;
    }

    setIsDeleting(true);
    const updatedList = documents.filter((d) => d.id !== doc.id);
    setDocuments(updatedList);
    saveStoredDocuments(updatedList);

    if (selectedDoc?.id === doc.id) {
      setSelectedDoc(null);
    }
    setDocToDelete(null);
    setIsDeleting(false);

    const isOutgoing = doc.managerClearance?.isCleared || doc.currentStatus === 'Cleared for Out' || doc.currentStatus === 'Dispatched / Completed';
    const logType = isOutgoing ? 'Outgoing Log' : 'Incoming Log';

    addNotification(
      'Log Entry Deleted',
      `${logType} entry "${doc.title}" (${doc.trackingNumber}) was permanently deleted by ${currentUser.name} (${currentUser.role}).`,
      currentUser.name,
      'sync',
      doc.trackingNumber
    );

    if (token && sheetConfig?.spreadsheetId) {
      scheduleSheetPush(updatedList, staffList);
    }
  };

  // Filtered documents calculation
  const filteredDocuments = documents.filter((doc) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      doc.trackingNumber.toLowerCase().includes(query) ||
      doc.title.toLowerCase().includes(query) ||
      doc.originDepartment.toLowerCase().includes(query) ||
      doc.responsiblePerson.toLowerCase().includes(query) ||
      doc.targetDivision.toLowerCase().includes(query) ||
      doc.currentLocation.toLowerCase().includes(query);

    let matchesViewMode = true;
    if (viewMode === 'incoming') {
      matchesViewMode = doc.currentStatus === 'Incoming Logged' || doc.currentStatus === 'Under Review';
    } else if (viewMode === 'outgoing') {
      matchesViewMode = doc.currentStatus === 'Cleared for Out' || doc.currentStatus === 'Dispatched / Completed';
    } else if (viewMode === 'compliance_needed') {
      matchesViewMode =
        doc.currentStatus === 'Supervisor Comment Needed' ||
        doc.supervisorRemarks?.some((r) => r.complianceRequired && !r.complied);
    } else if (viewMode === 'overdue') {
      matchesViewMode = calculateDocumentTimeInDesk(doc, timeInDeskConfig).isOverdue;
    }

    const matchesStatus = statusFilter === 'ALL' || doc.currentStatus === statusFilter;
    const matchesDivision = divisionFilter === 'ALL' || doc.targetDivision === divisionFilter;
    const matchesPriority = priorityFilter === 'ALL' || doc.priority === priorityFilter;

    return matchesSearch && matchesViewMode && matchesStatus && matchesDivision && matchesPriority;
  });

  // Sorted documents calculation with stable multi-field comparisons
  const sortedDocuments = useMemo(() => {
    const list = [...filteredDocuments];
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'trackingNumber':
          comparison = a.trackingNumber.localeCompare(b.trackingNumber, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
          break;
        case 'dateReceived': {
          const dateA = new Date(`${a.dateReceived}T${a.timeReceived || '00:00'}:00`).getTime() || 0;
          const dateB = new Date(`${b.dateReceived}T${b.timeReceived || '00:00'}:00`).getTime() || 0;
          comparison = dateA - dateB;
          break;
        }
        case 'targetDivision':
          comparison = (a.targetDivision || '').localeCompare(b.targetDivision || '', undefined, { sensitivity: 'base' });
          break;
        case 'currentCustodian':
          comparison = (a.currentCustodian || '').localeCompare(b.currentCustodian || '', undefined, { sensitivity: 'base' });
          break;
        case 'timeInDesk': {
          const elapsedA = calculateDocumentTimeInDesk(a, timeInDeskConfig).elapsedHours;
          const elapsedB = calculateDocumentTimeInDesk(b, timeInDeskConfig).elapsedHours;
          comparison = elapsedA - elapsedB;
          break;
        }
        case 'lifecycle': {
          const statusOrder: Record<string, number> = {
            'Incoming Logged': 1,
            'Under Review': 2,
            'Supervisor Comment Needed': 3,
            'Cleared for Out': 4,
            'Dispatched / Completed': 5,
          };
          comparison = (statusOrder[a.currentStatus] || 0) - (statusOrder[b.currentStatus] || 0);
          break;
        }
        default:
          comparison = 0;
      }

      if (comparison === 0) {
        comparison = (b.updatedAt || '').localeCompare(a.updatedAt || '');
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredDocuments, sortField, sortDirection, timeInDeskConfig]);

  // Statistics
  const totalCount = documents.length;
  const activeInOfficeCount = documents.filter(
    (d) => d.currentStatus !== 'Cleared for Out' && d.currentStatus !== 'Dispatched / Completed'
  ).length;
  const pendingComplianceCount = documents.filter((d) =>
    d.supervisorRemarks?.some((r) => r.complianceRequired && !r.complied)
  ).length;
  const clearedForOutCount = documents.filter(
    (d) => d.managerClearance?.isCleared || d.currentStatus === 'Cleared for Out'
  ).length;
  const overdueCount = documents.filter(
    (d) => calculateDocumentTimeInDesk(d, timeInDeskConfig).isOverdue
  ).length;
  const focalPendingCount = documents.filter(
    (d) =>
      ['Mary Flor Aquino', 'Aubrey Camille Cabreras'].includes(d.responsiblePerson) &&
      !d.managerClearance?.isCleared &&
      d.currentStatus !== 'Cleared for Out' &&
      d.currentStatus !== 'Dispatched / Completed'
  ).length;

  const currentRoleConfig = currentUser ? getRoleConfig(currentUser.role) : getRoleConfig('Viewer');
  const canDeleteLogs = currentUser ? canUserDeleteDocuments(currentUser.role) : false;

  return (
    <div className="min-h-screen bg-[#f3f6fa] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      
      {/* Executive Institutional Top Navigation Bar (Professional Slate / Grayscale Theme) */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-3.5 text-white shadow-md">
        <div className="w-full 2xl:max-w-[1920px] mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5">
          
          {/* Brand & Identity with Incorporated POSSD Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md ring-1 ring-slate-700 border border-slate-300">
              <PossdLogo className="w-9 h-9" variant="black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">
                  POSSD Document Tracking System
                </h1>
                <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Official Portal
                </span>
              </div>
            </div>
          </div>

          {/* User Session Profile, Log Out, Thresholds, Sheet & Actions */}
          <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Time-in-Desk Thresholds (Available ONLY for System Admin, moved to the left) */}
            {currentUser.role === 'System Admin' && (
              <button
                id="open-thresholds-btn"
                onClick={() => setActiveTab('admin')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shadow-2xs cursor-pointer ${
                  overdueCount > 0
                    ? 'bg-rose-950/80 text-rose-200 border-rose-600 hover:bg-rose-900'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
                title="System Admin: Manage Time-in-Desk thresholds & settings"
              >
                <Timer className={`w-4 h-4 ${overdueCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">Thresholds</span>
                {overdueCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold">
                    {overdueCount} Overdue
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-slate-300 border border-slate-700">
                    {timeInDeskConfig.defaultThresholdHours}h
                  </span>
                )}
              </button>
            )}

            {/* Active User Pill with Role Indicator */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-slate-700 text-slate-100 flex items-center justify-center text-xs font-bold shrink-0 ring-1 ring-slate-600">
                {currentUser.avatarInitials || currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white max-w-[130px] truncate">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded border bg-slate-900 text-slate-300 border-slate-700">
                    {currentUser.role}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 truncate max-w-[170px]">
                  {currentUser.division}
                </span>
              </div>
            </div>

            {/* Login Credentials / Switch Account */}
            <button
              id="login-credentials-btn"
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-all shadow-2xs cursor-pointer"
              title="Authenticate / Switch account"
            >
              <LogIn className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Switch / Sign In</span>
            </button>

            {/* Log Out Button - Turns back to Official Login Portal */}
            <button
              id="logout-header-btn"
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-rose-300 transition-all shadow-2xs cursor-pointer"
              title="Sign out and return to official login page"
            >
              <LogOut className="w-4 h-4 text-slate-400 hover:text-rose-300" />
              <span className="hidden sm:inline">Log Out</span>
            </button>

            {/* Google Sheets Sync Trigger */}
            <button
              id="open-sheet-sync-btn"
              onClick={() => setIsSheetModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-all shadow-2xs cursor-pointer"
              title="Google Sheet Integration"
            >
              <FileSpreadsheet className={`w-4 h-4 ${sheetConfig ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">
                {sheetConfig ? 'Sheet Linked' : 'Connect Sheet'}
              </span>
              {sheetConfig && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
            </button>

            {/* Theme Toggle Button (Light/Dark Mode) */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all shadow-2xs cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </button>

            {/* PWA App Install Button */}
            <PWAInstallButton className="hidden sm:inline-flex" />

            {/* Real-time Notification Center */}
            <NotificationCenter
              notifications={notifications}
              onClearNotifications={() => setNotifications([])}
              onSelectDocument={(trk) => {
                const doc = documents.find((d) => d.trackingNumber === trk);
                if (doc) setSelectedDoc(doc);
              }}
            />

            {/* Log Document Button (Incoming or Outgoing) */}
            <button
              id="log-incoming-btn"
              onClick={() => setIsIncomingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-600 shadow-md transition-colors cursor-pointer"
              title="Log incoming receipt or outgoing transmittal (Shortcut: N)"
            >
              <PlusCircle className="w-4 h-4 text-slate-300" />
              <span>Log Document</span>
              <kbd className="hidden lg:inline px-1 py-0.2 text-[9px] font-mono rounded bg-slate-900 text-slate-300 border border-slate-700">
                N
              </kbd>
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Horizontal Navigation Tabs (< lg) with sliding active indicator */}
      <div className="lg:hidden bg-slate-900 border-t border-slate-800 px-3 py-2">
        <div className="flex items-center justify-between gap-1">
          <nav className="flex items-center gap-1.5 overflow-x-auto py-1">
            {[
              { id: 'documents' as WorkspaceTab, label: 'Dashboard', count: documents.length, icon: FileText, color: 'text-slate-300' },
              { id: 'distribution' as WorkspaceTab, label: 'Distribution', count: focalPendingCount, icon: Users, color: 'text-slate-300' },
              { id: 'analytics' as WorkspaceTab, label: 'Analytics', icon: BarChart3, color: 'text-slate-300' },
              { id: 'links' as WorkspaceTab, label: 'Dedicated Links', count: dedicatedLinks.length, icon: Link2, color: 'text-sky-400' },
              ...(currentUser.role === 'System Admin'
                ? [{ id: 'admin' as WorkspaceTab, label: 'Admin Settings', icon: Sliders, color: 'text-slate-300' }]
                : []),
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobileActiveTabHighlight"
                      className="absolute inset-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xs pointer-events-none"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-200 border border-slate-700">
                        {tab.count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsSheetModalOpen(true)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs border border-slate-700 cursor-pointer"
              title="Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Frame with Left Vertical Navigation & Sliding Transition */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-65px)] bg-[#f3f6fa] dark:bg-slate-950">
        {/* Left Vertical Navigation Sidebar (Desktop) */}
        <div className="hidden lg:flex shrink-0">
          <VerticalNavigationSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            documentsCount={documents.length}
            focalPendingCount={focalPendingCount}
            overdueCount={overdueCount}
            activeCount={activeInOfficeCount}
            clearedCount={clearedForOutCount}
            isSheetConnected={!!sheetConfig}
            sheetTitle={sheetConfig?.title}
            isSyncing={isAutoSyncing}
            quotaCooldownSeconds={quotaCooldownSeconds}
            onManualSync={handleManualSync}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
            onOpenRolesModal={() => setIsRolesModalOpen(true)}
            onOpenThresholdModal={() => setIsThresholdModalOpen(true)}
            onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
            currentUserRole={currentUser.role}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
          />
        </div>

        {/* Dynamic Main Workspace Content with Sliding Transition */}
        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-7 overflow-y-auto">
          <div className="w-full 2xl:max-w-[1920px] mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-6"
              >
                {activeTab === 'distribution' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-emerald-500" />
                Distribution Desk - Focal Personnel
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Documents awaiting distribution or assignment by Focal Persons.
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 dark:bg-slate-900 text-slate-100 font-bold uppercase tracking-wider text-[11px] border-b border-slate-700 dark:border-slate-800">
                    <th className="py-3.5 px-4">Tracking Code</th>
                    <th className="py-3.5 px-4">Title & Classification</th>
                    <th className="py-3.5 px-4">Focal Person</th>
                    <th className="py-3.5 px-4">Origin Dept</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Lifecycle Progress</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {documents.filter(d => ['Mary Flor Aquino', 'Aubrey Camille Cabreras'].includes(d.responsiblePerson)).map(doc => (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/70 border-l-4 border-l-transparent hover:border-l-blue-500 transition-all duration-150 cursor-pointer group hover:shadow-sm"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">{doc.trackingNumber}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px] group-hover:text-blue-300 transition-colors">{doc.title}</p>
                        <p className="text-[11px] text-slate-500">{doc.documentType}</p>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-slate-700 dark:text-slate-300 font-medium">{doc.responsiblePerson}</td>
                      <td className="py-3.5 px-4 text-sm text-slate-600 dark:text-slate-400">{doc.originDepartment}</td>
                      <td className="py-3.5 px-4">
                        <DocumentLifecycleProgress document={doc} variant="compact" />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDoc(doc);
                          }}
                          className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/40 dark:hover:bg-blue-800/60 dark:text-blue-200 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs hover:shadow-md"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                  {documents.filter(d => ['Mary Flor Aquino', 'Aubrey Camille Cabreras'].includes(d.responsiblePerson)).length === 0 && (
                     <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-500">No documents pending distribution for focal persons.</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'analytics' ? (

          <DocumentAnalyticsDashboard
            documents={documents}
            staffList={staffList}
            onSelectDocument={(doc) => setSelectedDoc(doc)}
          />
        ) : activeTab === 'links' ? (
          <DedicatedLinksView
            links={dedicatedLinks}
            onAddLink={handleAddDedicatedLink}
            onUpdateLink={handleUpdateDedicatedLink}
            onDeleteLink={handleDeleteDedicatedLink}
            currentUserRole={currentUser?.role || 'Viewer'}
            currentUserName={currentUser?.name || 'Guest User'}
            availableDivisions={dropdownOptions.departments}
          />
        ) : activeTab === 'admin' ? (
          <AdminSettingsView
            timeInDeskConfig={timeInDeskConfig}
            onSaveConfig={handleSaveThresholdConfig}
            documents={documents}
            staffList={staffList}
            sheetConfig={sheetConfig}
            onOpenRolesModal={() => setIsRolesModalOpen(true)}
            onOpenSheetModal={() => setIsSheetModalOpen(true)}
            availableDivisions={dropdownOptions.departments}
          />
        ) : (
          <>
        {/* KPI / Dashboard Summary Cards (Executive Professional Color Accents with Rich Hover Effects) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          
          {/* 1. Total Monitored - Royal Blue Accent */}
          <div
            onClick={() => setViewMode('all')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 group hover:-translate-y-1 active:scale-[0.98] ${
              viewMode === 'all'
                ? 'bg-gradient-to-br from-blue-950/90 via-slate-900 to-indigo-950/60 border-blue-500 ring-2 ring-blue-500/40 shadow-xl shadow-blue-950/50'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-950/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">Total Monitored</span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700/60 group-hover:scale-115 group-hover:rotate-6 transition-all duration-200 shadow-2xs group-hover:shadow-blue-500/20">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight group-hover:text-blue-500 dark:group-hover:text-blue-300 transition-colors">{totalCount}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Dashboard document archive</p>
          </div>

          {/* 2. Ongoing - Warm Amber Accent */}
          <div
            onClick={() => setViewMode('incoming')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 group hover:-translate-y-1 active:scale-[0.98] ${
              viewMode === 'incoming'
                ? 'bg-gradient-to-br from-amber-950/90 via-slate-900 to-yellow-950/60 border-amber-500 ring-2 ring-amber-500/40 shadow-xl shadow-amber-950/50'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-950/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">Ongoing</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60 group-hover:scale-115 group-hover:rotate-6 transition-all duration-200 shadow-2xs group-hover:shadow-amber-500/20">
                <Inbox className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight group-hover:text-amber-500 dark:group-hover:text-amber-300 transition-colors">{activeInOfficeCount}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Under desk routing & action</p>
          </div>

          {/* 3. Action Required (Previously With comments from Supervisor) - Violet/Purple Accent */}
          <div
            onClick={() => setViewMode('compliance_needed')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 group hover:-translate-y-1 active:scale-[0.98] ${
              viewMode === 'compliance_needed'
                ? 'bg-gradient-to-br from-purple-950/90 via-slate-900 to-fuchsia-950/60 border-purple-500 ring-2 ring-purple-500/40 shadow-xl shadow-purple-950/50'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-950/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:translate-x-0.5 transition-transform">Action Required</span>
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-700/60 group-hover:scale-115 group-hover:rotate-6 transition-all duration-200 shadow-2xs group-hover:shadow-purple-500/20">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight group-hover:text-purple-500 dark:group-hover:text-purple-300 transition-colors">{pendingComplianceCount}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">Supervisor notes & compliance</p>
          </div>

          {/* 4. Overdue Stay - Crimson Rose Accent */}
          <div
            onClick={() => setViewMode(viewMode === 'overdue' ? 'all' : 'overdue')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 group hover:-translate-y-1 active:scale-[0.98] ${
              viewMode === 'overdue'
                ? 'bg-gradient-to-br from-rose-950/90 via-slate-900 to-red-950/60 border-rose-500 ring-2 ring-rose-500/40 shadow-xl shadow-rose-950/50'
                : overdueCount > 0
                ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-950/30 shadow-2xs'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-rose-500 hover:shadow-lg hover:shadow-rose-950/30 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold group-hover:translate-x-0.5 transition-transform ${overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-rose-600/80 dark:text-rose-400/80'}`}>
                Overdue Stay
              </span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center border group-hover:scale-115 group-hover:rotate-6 transition-all duration-200 ${
                  overdueCount > 0
                    ? 'bg-rose-100 dark:bg-rose-900/70 text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-700 shadow-2xs group-hover:shadow-rose-500/20'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 border-rose-200 dark:border-rose-800/50'
                }`}
              >
                <Timer className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black mt-2 tracking-tight text-slate-900 dark:text-white group-hover:text-rose-500 dark:group-hover:text-rose-300 transition-colors">
              {overdueCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {overdueCount > 0 ? 'Exceeded desk SLA threshold' : 'All desks within SLA'}
            </p>
          </div>

          {/* 5. Cleared for Out - Mint Emerald Accent */}
          <div
            onClick={() => setViewMode('outgoing')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 group hover:-translate-y-1 active:scale-[0.98] ${
              viewMode === 'outgoing'
                ? 'bg-gradient-to-br from-emerald-950/90 via-slate-900 to-teal-950/60 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-950/50'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-950/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">Cleared for Out</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60 group-hover:scale-115 group-hover:rotate-6 transition-all duration-200 shadow-2xs group-hover:shadow-emerald-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight group-hover:text-emerald-500 dark:group-hover:text-emerald-300 transition-colors">{clearedForOutCount}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">Manager sign-off authorized</p>
          </div>

        </div>

        {/* Google Sheet Sync Alert Ribbon (if connected) - Professional Slate Theme */}
        {sheetConfig && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs transition-colors text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-slate-500 animate-pulse" />
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-slate-900 dark:text-white">
                  Google Sheet Connected:
                </span>
                <span className="text-slate-600 dark:text-slate-400 truncate">
                  {sheetConfig.sheetName || 'Master Tracking'} ({documents.length} doc{documents.length === 1 ? '' : 's'} in registry)
                </span>
              </div>
              {(hasPendingSyncRef.current || safeStorageGet('possd_has_unpushed_changes') === 'true') && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shrink-0">
                  Unpushed Changes
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                id="ribbon-push-all-btn"
                onClick={handlePushAllNow}
                disabled={isPushingAll || isAutoSyncing}
                title="Force push all document registry rows to the linked Google Sheet"
                className="inline-flex items-center gap-1.5 font-bold cursor-pointer transition-colors px-2.5 py-1 rounded-lg text-xs disabled:opacity-50 bg-slate-800 hover:bg-slate-700 text-white shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPushingAll ? 'animate-spin' : ''}`} />
                {isPushingAll ? 'Pushing All...' : 'Push All'}
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <a
                href={sheetConfig.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Open File <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Search, Filter Bar & Controls */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3.5 transition-colors">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="document-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracking number, subject, originating department, custodian..."
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-slate-50/50 dark:bg-slate-800/80"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                  title="Clear search"
                >
                  ✕
                </button>
              ) : (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none">
                  <kbd className="px-1.5 py-0.5 text-[9.5px] font-mono text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
                    /
                  </kbd>
                </div>
              )}
            </div>

            {/* Quick Status Pill Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap mr-1">Filter:</span>
              {[
                { id: 'ALL', label: 'All Status', activeClass: 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100' },
                { id: 'Incoming Logged', label: 'Incoming', activeClass: 'bg-slate-800 text-white border-slate-800' },
                { id: 'Under Review', label: 'In Review', activeClass: 'bg-slate-700 text-white border-slate-700' },
                { id: 'Supervisor Comment Needed', label: 'Remarks', activeClass: 'bg-slate-800 text-white border-slate-800 font-bold' },
                { id: 'Cleared for Out', label: 'Cleared Out', activeClass: 'bg-slate-800 text-white border-slate-800' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                    statusFilter === s.id
                      ? `${s.activeClass} shadow-xs`
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

          </div>

          {/* Secondary Dropdown Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 cursor-pointer"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="Routine">Routine</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Rush">Rush</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">Target Division:</span>
                <select
                  value={divisionFilter}
                  onChange={(e) => setDivisionFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500 max-w-[220px] cursor-pointer"
                >
                  <option value="ALL">All Divisions</option>
                  {dropdownOptions.departments.length > 0 ? (
                    dropdownOptions.departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))
                  ) : (
                    Array.from(new Set(documents.map((d) => d.targetDivision).filter(Boolean))).map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {canDeleteLogs ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-[11px] font-semibold shadow-2xs">
                  <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Log Deletion Allowed ({currentUser.role})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[11px]">
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Log Deletion: System Admin & Dept Mgr Only</span>
                </span>
              )}
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>
                  Showing <strong className="text-slate-900 dark:text-white">{sortedDocuments.length}</strong> of {totalCount} records
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                  title="Click to toggle ascending/descending order"
                >
                  <span className="text-slate-500 dark:text-slate-400 font-normal">Sorted by:</span>
                  <span>
                    {sortField === 'trackingNumber' && 'Tracking Code'}
                    {sortField === 'title' && 'Title'}
                    {sortField === 'dateReceived' && 'Date Inflow'}
                    {sortField === 'targetDivision' && 'Forwarded To'}
                    {sortField === 'currentCustodian' && 'Custodian'}
                    {sortField === 'timeInDesk' && 'Time in Desk'}
                    {sortField === 'lifecycle' && 'Lifecycle Status'}
                  </span>
                  {sortDirection === 'asc' ? (
                    <ArrowUp className="w-3 h-3 text-slate-600 dark:text-slate-300 stroke-[2.5]" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-slate-600 dark:text-slate-300 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Table View - Professional Monochrome Slate Theme */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 dark:bg-slate-950 text-white font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
                  {/* Tracking Code */}
                  <th
                    scope="col"
                    aria-sort={sortField === 'trackingNumber' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('trackingNumber')}
                    className={`py-3.5 px-4 cursor-pointer select-none group transition-colors ${
                      sortField === 'trackingNumber'
                        ? 'bg-slate-800 dark:bg-slate-900 text-slate-100'
                        : 'hover:bg-slate-800/80 dark:hover:bg-slate-900/80'
                    }`}
                    title={sortField === 'trackingNumber' ? `Sorted by Tracking Code (${sortDirection === 'asc' ? 'Ascending' : 'Descending'}). Click to invert.` : 'Click to sort by Tracking Code'}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Tracking Code</span>
                      {sortField === 'trackingNumber' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400/50 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </th>

                  {/* Title & Classification */}
                  <th
                    scope="col"
                    aria-sort={sortField === 'title' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('title')}
                    className={`py-3.5 px-4 cursor-pointer select-none group transition-colors ${
                      sortField === 'title'
                        ? 'bg-slate-800 dark:bg-slate-900 text-slate-100'
                        : 'hover:bg-slate-800/80 dark:hover:bg-slate-900/80'
                    }`}
                    title={sortField === 'title' ? `Sorted by Title (${sortDirection === 'asc' ? 'Ascending' : 'Descending'}). Click to invert.` : 'Click to sort by Title & Classification'}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Title &amp; Classification</span>
                      {sortField === 'title' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400/50 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </th>

                  {/* Origin & Time Inflow */}
                  <th
                    scope="col"
                    aria-sort={sortField === 'dateReceived' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('dateReceived')}
                    className={`py-3.5 px-4 cursor-pointer select-none group transition-colors ${
                      sortField === 'dateReceived'
                        ? 'bg-slate-800 dark:bg-slate-900 text-slate-100'
                        : 'hover:bg-slate-800/80 dark:hover:bg-slate-900/80'
                    }`}
                    title={sortField === 'dateReceived' ? `Sorted by Date Received (${sortDirection === 'asc' ? 'Ascending' : 'Descending'}). Click to invert.` : 'Click to sort by Origin & Date Inflow'}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Origin &amp; Time Inflow</span>
                      {sortField === 'dateReceived' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400/50 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </th>

                  {/* Forwarded To & Officer */}
                  <th
                    scope="col"
                    aria-sort={sortField === 'targetDivision' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('targetDivision')}
                    className={`py-3.5 px-4 cursor-pointer select-none group transition-colors ${
                      sortField === 'targetDivision'
                        ? 'bg-slate-800 dark:bg-slate-900 text-slate-100'
                        : 'hover:bg-slate-800/80 dark:hover:bg-slate-900/80'
                    }`}
                    title={sortField === 'targetDivision' ? `Sorted by Forwarded Division (${sortDirection === 'asc' ? 'Ascending' : 'Descending'}). Click to invert.` : 'Click to sort by Forwarded Division & Officer'}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Forwarded To &amp; Officer</span>
                      {sortField === 'targetDivision' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400/50 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </th>

                  {/* Current Custodian */}
                  <th
                    scope="col"
                    aria-sort={sortField === 'currentCustodian' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('currentCustodian')}
                    className={`py-3.5 px-4 cursor-pointer select-none group transition-colors ${
                      sortField === 'currentCustodian'
                        ? 'bg-slate-800 dark:bg-slate-900 text-slate-100'
                        : 'hover:bg-slate-800/80 dark:hover:bg-slate-900/80'
                    }`}
                    title={sortField === 'currentCustodian' ? `Sorted by Current Custodian (${sortDirection === 'asc' ? 'Ascending' : 'Descending'}). Click to invert.` : 'Click to sort by Current Custodian'}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Current Custodian</span>
                      {sortField === 'currentCustodian' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400/50 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </th>

                  {/* Time in Desk */}
                  <th
                    scope="col"
                    aria-sort={sortField === 'timeInDesk' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('timeInDesk')}
                    className={`py-3.5 px-4 cursor-pointer select-none group transition-colors ${
                      sortField === 'timeInDesk'
                        ? 'bg-slate-800 dark:bg-slate-900 text-slate-100'
                        : 'hover:bg-slate-800/80 dark:hover:bg-slate-900/80'
                    }`}
                    title={sortField === 'timeInDesk' ? `Sorted by Time in Desk (${sortDirection === 'asc' ? 'Ascending' : 'Descending'}). Click to invert.` : 'Click to sort by Time in Desk'}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Time in Desk</span>
                      {sortField === 'timeInDesk' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400/50 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </th>

                  {/* Lifecycle Progress */}
                  <th
                    scope="col"
                    aria-sort={sortField === 'lifecycle' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort('lifecycle')}
                    className={`py-3.5 px-4 min-w-[210px] cursor-pointer select-none group transition-colors ${
                      sortField === 'lifecycle'
                        ? 'bg-slate-800 dark:bg-slate-900 text-slate-100'
                        : 'hover:bg-slate-800/80 dark:hover:bg-slate-900/80'
                    }`}
                    title={sortField === 'lifecycle' ? `Sorted by Lifecycle Progress (${sortDirection === 'asc' ? 'Ascending' : 'Descending'}). Click to invert.` : 'Click to sort by Lifecycle Progress'}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>Lifecycle Progress</span>
                      {sortField === 'lifecycle' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-slate-200 stroke-[2.5]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400/50 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </th>

                  {/* Actions Column (Non-sortable) */}
                  <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="font-bold text-slate-800 dark:text-slate-200">No documents match filter criteria.</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        Reset filters or click "Log Document" to register a new record.
                      </p>
                    </td>
                  </tr>
                ) : (
                  sortedDocuments.map((doc) => {
                    const hasPendingRemarks = doc.supervisorRemarks?.some(
                      (r) => r.complianceRequired && !r.complied
                    );
                    const isCleared = doc.managerClearance?.isCleared;
                    const timeMetrics = calculateDocumentTimeInDesk(doc, timeInDeskConfig);
                    const isOverdue = timeMetrics.isOverdue;
                    const shouldHighlightOverdue =
                      timeInDeskConfig.highlightRowOnExceed && isOverdue;

                    return (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className={`transition-all duration-150 cursor-pointer group border-l-4 ${
                          shouldHighlightOverdue
                            ? 'bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100/90 dark:hover:bg-rose-900/40 border-l-rose-500 shadow-2xs hover:shadow-md'
                            : 'border-l-transparent hover:border-l-blue-500 hover:bg-blue-50/50 dark:hover:bg-slate-800/80 shadow-2xs hover:shadow-md'
                        }`}
                      >
                        {/* Tracking # & Priority */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 inline-block transition-all duration-150">
                            {doc.trackingNumber}
                          </span>
                          <span
                            className={`inline-block ml-2 px-1.5 py-0.2 rounded text-[10px] font-bold transition-transform duration-150 group-hover:scale-105 ${
                              doc.priority === 'Rush'
                                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : doc.priority === 'Urgent'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {doc.priority}
                          </span>
                        </td>

                        {/* Title & Type */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                              {doc.title}
                            </p>
                            {doc.fileLink && (
                              <a
                                href={doc.fileLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-0.5 p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-md shrink-0 transition-all hover:scale-115 active:scale-95 shadow-2xs hover:shadow-xs"
                                title="Open attached cloud file / drive link"
                              >
                                <Link2 className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block max-w-xs truncate" title={`${doc.communicationType} | ${doc.reportType} | ${doc.documentType}`}>
                            {doc.communicationType} &bull; {doc.reportType} &bull; {doc.documentType}
                          </span>
                        </td>

                        {/* Origin Department & Auto Timestamp */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                            {doc.originDepartment}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            <span>
                              {doc.dateReceived} • {doc.timeReceived}
                            </span>
                          </div>
                        </td>

                        {/* Target Division & Responsible Person */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                            {doc.targetDivision}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span className="truncate">{doc.responsiblePerson}</span>
                          </p>
                        </td>

                        {/* Current Location & Custodian */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-semibold">
  <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
  <span className="truncate max-w-[160px]">{doc.currentCustodian}</span>
</div>
                        </td>

                        {/* Time in Desk / Dwell SLA */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isCleared ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                {timeMetrics.elapsedFormatted}
                              </span>
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                                Cleared out
                              </span>
                            </div>
                          ) : isOverdue ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-rose-700 dark:text-rose-400">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                {timeMetrics.elapsedFormatted}
                              </span>
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                                +{timeMetrics.overdueFormatted} overdue (max {timeMetrics.thresholdHours}h)
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                                <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                                {timeMetrics.elapsedFormatted}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {timeMetrics.remainingFormatted} left (max {timeMetrics.thresholdHours}h)
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Status & Lifecycle Progress Bar */}
                        <td className="py-3.5 px-4">
                          <DocumentLifecycleProgress document={doc} variant="compact" />
                        </td>

                        {/* Action Link & Deletion */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canDeleteLogs ? (
                              <button
                                type="button"
                                id={`delete-doc-${doc.trackingNumber}`}
                                title={`Delete log entry (${doc.trackingNumber}) - Authorized for ${currentUser.role}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDocToDelete(doc);
                                }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:border-rose-300 dark:hover:border-rose-700 transition-all duration-150 hover:scale-110 active:scale-95 shadow-2xs hover:shadow-sm cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span
                                title="Entry deletion strictly restricted to System Admins & Department Manager"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200/70 dark:border-slate-800 text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/40 cursor-not-allowed"
                              >
                                <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                              </span>
                            )}

                            <button
                              id={`view-doc-${doc.trackingNumber}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDoc(doc);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-800 dark:text-blue-300 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-150 hover:scale-105 active:scale-95 shadow-2xs hover:shadow-md cursor-pointer group/btn"
                            >
                              <span>Open Route</span>
                              <ChevronRight className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 group-hover/btn:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
          </>
        )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Modal: Login / Authentication */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(authedStaff) => {
          setCurrentUser(authedStaff);
          setIsLoginModalOpen(false);
          addNotification(
            'Authenticated Session',
            `Signed in as ${authedStaff.name} (${authedStaff.role}) via enrolled portal credentials.`,
            authedStaff.name,
            'movement',
            'AUTH-LOGIN'
          );
        }}
        staffList={staffList}
      />

      {/* Modal: Staff Roles, Credentials & Permission Matrix Management */}
      <RolesManagementModal
        isOpen={isRolesModalOpen}
        onClose={() => setIsRolesModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={(u) => setCurrentUser(u)}
        staffList={staffList}
        onAddStaffMember={handleAddStaffMember}
        onUpdateStaffRole={handleUpdateStaffRole}
        onUpdateStaffCredentials={handleUpdateStaffCredentials}
        onDeleteStaffMember={handleDeleteStaffMember}
        documents={documents}
        dropdownOptions={dropdownOptions}
        onUpdateDropdownOptions={handleUpdateDropdownOptions}
        sheetConfig={sheetConfig}
        token={token}
        onSyncToSheet={async () => {
          if (!token || !sheetConfig) return;
          await syncPersonnelOnlyToSheet(token, sheetConfig.spreadsheetId, staffList);
        }}
        onPullFromSheet={async () => {
          if (!token || !sheetConfig) return;
          const pulled = await pullPersonnelFromSheet(token, sheetConfig.spreadsheetId, staffList);
          setStaffList(pulled);
          saveStoredStaffMembers(pulled);
          broadcastDataUpdate('staff', pulled);
        }}
        onImportStaff={(importedStaff, newOptions, newSheetConfig) => {
          setStaffList(importedStaff);
          saveStoredStaffMembers(importedStaff);
          broadcastDataUpdate('staff', importedStaff);
          if (newOptions) {
            setDropdownOptions(newOptions);
            saveStoredDropdownOptions(newOptions);
            broadcastDataUpdate('dropdowns', newOptions);
          }
          if (newSheetConfig && !sheetConfig) {
            setSheetConfig(newSheetConfig);
            saveStoredSheetConfig(newSheetConfig);
          }
        }}
      />

      {/* Modal: New Incoming Document Form */}
      <IncomingDocumentModal
        isOpen={isIncomingModalOpen}
        onClose={() => setIsIncomingModalOpen(false)}
        onSubmit={handleCreateDocument}
        currentUser={currentUser}
        availableDivisions={dropdownOptions.departments}
        dropdownOptions={dropdownOptions}
        timeInDeskConfig={timeInDeskConfig}
      />

      {/* Modal: Document Detail, Internal Routing, Supervisor Remarks & Manager Clearance */}
      <DocumentDetailModal
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        currentUser={currentUser}
        onUpdateDocument={handleUpdateDocument}
        onSwitchRole={handleQuickSwitchRole}
        onDeleteDocument={(doc) => setDocToDelete(doc)}
        timeInDeskConfig={timeInDeskConfig}
        onConfigureThreshold={() => setIsThresholdModalOpen(true)}
      />

      {/* Modal: Time-in-Desk Division Threshold Configuration */}
      <TimeInDeskConfigModal
        isOpen={isThresholdModalOpen}
        onClose={() => setIsThresholdModalOpen(false)}
        config={timeInDeskConfig}
        onSaveConfig={handleSaveThresholdConfig}
        currentUserRole={currentUser.role}
        documents={documents}
        availableDivisions={dropdownOptions.departments}
      />

      {/* Modal: Google Sheet Sync & Integration */}
      <GoogleSheetSyncModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        user={user}
        token={token}
        onAuthSuccess={(u, t) => {
          setUser(u);
          setToken(t);
          setAccessToken(t);
        }}
        onSignOut={() => {
          setUser(null);
          setToken(null);
          setAccessToken(null);
        }}
        sheetConfig={sheetConfig}
        onSaveSheetConfig={(cfg) => {
          setSheetConfig(cfg);
          saveStoredSheetConfig(cfg);
        }}
        documents={documents}
        staffList={staffList}
        onNotify={(title, msg, type) =>
          addNotification(title, msg, currentUser.name, type, 'SHEET-SYNC')
        }
        onPullSuccess={(pulledDocs, pulledStaff) => {
          if (pulledDocs && pulledDocs.length > 0) {
            setDocuments(pulledDocs);
            saveStoredDocuments(pulledDocs);
            broadcastDataUpdate('documents', pulledDocs);
          }
          if (pulledStaff && pulledStaff.length > 0) {
            setStaffList(pulledStaff);
            saveStoredStaffMembers(pulledStaff);
            broadcastDataUpdate('staff', pulledStaff);
          }
        }}
      />

      {/* Modal: Keyboard Shortcuts Guide */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Modal: Delete Document Confirmation (System Admin & Department Manager) */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden transition-colors">
            
            {/* Modal Header */}
            <div className="p-5 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Delete Document Log Entry
                  </h3>
                  <p className="text-xs text-rose-800 dark:text-rose-300 font-medium">
                    Authorized Action: System Admin & Department Manager Only
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete this document from the registry logs? This action will remove all internal tracking history, routing records, supervisor remarks, and linked Google Sheet rows.
              </p>

              {/* Target Document Summary Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {docToDelete.trackingNumber}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      docToDelete.managerClearance?.isCleared || docToDelete.currentStatus === 'Cleared for Out'
                        ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                    }`}
                  >
                    {docToDelete.managerClearance?.isCleared || docToDelete.currentStatus === 'Cleared for Out'
                      ? 'Outgoing Registry'
                      : 'Incoming Registry'}
                  </span>
                </div>

                <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                  {docToDelete.title}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block">Classification:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-medium">{docToDelete.documentType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block">Originating Dept:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-medium truncate block">{docToDelete.originDepartment}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block">Received Timestamp:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-medium">{docToDelete.dateReceived} • {docToDelete.timeReceived}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block">Current Status:</span>
                    <span className="text-slate-700 dark:text-slate-200 font-medium">{docToDelete.currentStatus}</span>
                  </div>
                </div>
              </div>

              {/* Role Audit Verification Badge */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Operator Authorization:</span> You are deleting as{' '}
                  <strong className="text-slate-900 dark:text-white">{currentUser.name}</strong> (<span className="text-amber-800 dark:text-amber-400 font-semibold">{currentUser.role}</span>). This event is permanently recorded in the system notification and sync trail.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-doc-btn"
                disabled={isDeleting}
                onClick={() => handleDeleteDocument(docToDelete)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Entry...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Permanently Delete Entry</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
