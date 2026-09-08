import React, { useState, useEffect, useMemo } from 'react';
import {
  DocumentItem,
  RealtimeNotification,
  AppUserRole,
  UserRoleType,
  RegistryDropdownOptions,
  TimeInDeskConfig,
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
} from './mockData';
import {
  SheetMetadata,
  syncAllDocumentsToSheet,
  syncPersonnelOnlyToSheet,
  pullPersonnelFromSheet,
  pullAllFromSheet,
} from './lib/googleSheets';
import { initAuth, setAccessToken, getAccessToken } from './lib/firebase';
import { User } from 'firebase/auth';
import { NotificationCenter } from './components/NotificationCenter';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { IncomingDocumentModal } from './components/IncomingDocumentModal';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { RolesManagementModal } from './components/RolesManagementModal';
import { TimeInDeskConfigModal } from './components/TimeInDeskConfigModal';
import { DocumentAnalyticsDashboard } from './components/DocumentAnalyticsDashboard';
import { LoginModal } from './components/LoginModal';
import { PossdLogo } from './components/PossdLogo';
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
} from 'lucide-react';

export default function App() {
  // Theme Toggle State ('light' | 'dark')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('possd_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('possd_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Authentication & Google Sheets State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sheetConfig, setSheetConfig] = useState<SheetMetadata | null>(null);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);

  // Time-in-Desk Threshold Configuration State
  const [timeInDeskConfig, setTimeInDeskConfig] = useState<TimeInDeskConfig>(() =>
    getTimeInDeskConfig()
  );
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);

  // Staff & Roles State
  const [staffList, setStaffList] = useState<AppUserRole[]>(() => getStoredStaffMembers());
  const [currentUser, setCurrentUser] = useState<AppUserRole>(() => {
    const list = getStoredStaffMembers();
    return list[0] || {
      id: 'staff-1',
      name: 'Ana Cruz',
      role: 'Admin Staff',
      division: 'Central Records & Receiving Desk',
    };
  });
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState<RegistryDropdownOptions>(() => getStoredDropdownOptions());

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
  const [activeTab, setActiveTab] = useState<'documents' | 'analytics'>('documents');

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
    setDocuments(getStoredDocuments());
    const existingConfig = getStoredSheetConfig();
    setSheetConfig(existingConfig);

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
      },
      () => {
        setUser(null);
        setToken(null);
        setAccessToken(null);
      }
    );

    return () => {
      unsubscribe();
      cleanupBroadcast();
    };
  }, []);

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

    // Auto-sync to Google Sheet if connected
    if (token && sheetConfig) {
      syncPersonnelOnlyToSheet(token, sheetConfig.spreadsheetId, updated).catch((err) => {
        console.warn('Auto-sync personnel to Google Sheet error:', err);
      });
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
      syncPersonnelOnlyToSheet(token, sheetConfig.spreadsheetId, updated).catch((err) => {
        console.warn('Auto-sync personnel to Google Sheet error:', err);
      });
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
      syncPersonnelOnlyToSheet(token, sheetConfig.spreadsheetId, updated).catch((err) => {
        console.warn('Auto-sync personnel to Google Sheet error:', err);
      });
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
      syncPersonnelOnlyToSheet(token, sheetConfig.spreadsheetId, updated).catch((err) => {
        console.warn('Auto-sync personnel to Google Sheet error:', err);
      });
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

    if (token && sheetConfig?.spreadsheetId) {
      try {
        await syncAllDocumentsToSheet(token, sheetConfig.spreadsheetId, updatedList, staffList);
      } catch (err) {
        console.error('Auto sync sheet error:', err);
      }
    }
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

    if (token && sheetConfig?.spreadsheetId) {
      try {
        await syncAllDocumentsToSheet(token, sheetConfig.spreadsheetId, updatedList, staffList);
      } catch (err) {
        console.error('Auto sync sheet error:', err);
      }
    }
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
      try {
        await syncAllDocumentsToSheet(token, sheetConfig.spreadsheetId, updatedList);
        addNotification(
          'Google Sheet Synced',
          `Registry row for ${doc.trackingNumber} removed from connected Google Sheet.`,
          'System Sync',
          'sync',
          doc.trackingNumber
        );
      } catch (err) {
        console.error('Auto sync sheet error after deletion:', err);
      }
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

  const currentRoleConfig = getRoleConfig(currentUser.role);
  const canDeleteLogs = canUserDeleteDocuments(currentUser.role);

  return (
    <div className="min-h-screen bg-[#f3f6fa] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      
      {/* Executive Institutional Top Navigation Bar (Deep Navy Blue, Gold, Green & White) */}
      <header className="sticky top-0 z-30 bg-[#0c2340] border-b border-[#1b3d64] px-4 sm:px-8 py-3.5 text-white shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5">
          
          {/* Brand & Identity with Incorporated POSSD Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md ring-2 ring-amber-400/60 border border-slate-200">
              <PossdLogo className="w-9 h-9" variant="black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">
                  POSSD Document Tracking System
                </h1>
                <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Official Portal
                </span>
              </div>
              <p className="text-xs text-blue-200/90 hidden sm:block">
                Desk Routing • Supervisor Remarks & Compliance • Manager Clearance • Google Sheets
              </p>
            </div>
          </div>

          {/* User Session Profile, Role Switcher, Google Sheet & Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Active User Pill with Role Indicator */}
            <div className="flex items-center gap-2 bg-[#102e52] border border-[#204975] rounded-xl px-2.5 py-1.5 shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 ring-1 ring-amber-400/40">
                {currentUser.avatarInitials || currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white max-w-[130px] truncate">
                    {currentUser.name}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${currentRoleConfig.badgeBg} ${currentRoleConfig.badgeText} ${currentRoleConfig.badgeBorder}`}>
                    {currentUser.role}
                  </span>
                </div>
                <span className="text-[10px] text-blue-200/70 truncate max-w-[170px]">
                  {currentUser.division}
                </span>
              </div>

              {/* Quick Switch Dropdown */}
              <select
                id="active-user-quick-select"
                value={currentUser.id || currentUser.name}
                onChange={(e) => {
                  const found = staffList.find((s) => s.id === e.target.value || s.name === e.target.value);
                  if (found) setCurrentUser(found);
                }}
                className="bg-[#0c2340] text-blue-100 text-xs rounded-lg px-2 py-1 font-medium border border-[#275586] focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                title="Switch active user to experience permissions across staff, supervisor, and manager"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#0c2340] text-white">
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Login / Auth Credentials Trigger */}
            <button
              id="login-credentials-btn"
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#102e52] hover:bg-[#163d6b] border border-[#204975] text-amber-300 hover:text-amber-200 transition-all shadow-2xs cursor-pointer"
              title="Authenticate with enrolled username & password"
            >
              <LogIn className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">Sign In</span>
            </button>

            {/* Manage Roles Modal Trigger */}
            <button
              id="open-roles-btn"
              onClick={() => setIsRolesModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#102e52] hover:bg-[#163d6b] border border-[#204975] text-blue-100 hover:text-white transition-all shadow-2xs cursor-pointer"
              title="Open Staff Roles, Credentials & Permission Matrix"
            >
              <UserCog className="w-4 h-4 text-blue-300" />
              <span className="hidden sm:inline">Roles</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-950 text-blue-200 border border-blue-800">
                {staffList.length}
              </span>
            </button>

            {/* Time-in-Desk Threshold Configuration Trigger (Yellow / Warning Accent) */}
            <button
              id="open-thresholds-btn"
              onClick={() => setIsThresholdModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shadow-2xs cursor-pointer ${
                overdueCount > 0
                  ? 'bg-rose-950/80 text-rose-200 border-rose-600 hover:bg-rose-900'
                  : 'bg-[#102e52] text-amber-200 border-amber-400/30 hover:bg-[#163d6b] hover:border-amber-400/50'
              }`}
              title="Configure Time-in-Desk thresholds per division"
            >
              <Timer className={`w-4 h-4 ${overdueCount > 0 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
              <span className="hidden sm:inline">Thresholds</span>
              {overdueCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold animate-pulse">
                  {overdueCount} Overdue
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {timeInDeskConfig.defaultThresholdHours}h
                </span>
              )}
            </button>

            {/* Google Sheets Sync Trigger (Green Accent) */}
            <button
              id="open-sheet-sync-btn"
              onClick={() => setIsSheetModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shadow-2xs ${
                sheetConfig
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 hover:bg-emerald-900'
                  : 'bg-[#102e52] text-emerald-200 border-[#204975] hover:bg-[#163d6b] hover:text-white'
              }`}
            >
              <FileSpreadsheet className={`w-4 h-4 ${sheetConfig ? 'text-emerald-400' : 'text-emerald-300/80'}`} />
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
              className="p-2 rounded-xl text-xs font-semibold bg-[#102e52] hover:bg-[#163d6b] border border-[#204975] text-amber-300 hover:text-amber-200 transition-all shadow-2xs cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-blue-200" />}
            </button>

            {/* Real-time Notification Center */}
            <NotificationCenter
              notifications={notifications}
              onClearNotifications={() => setNotifications([])}
              onSelectDocument={(trk) => {
                const doc = documents.find((d) => d.trackingNumber === trk);
                if (doc) setSelectedDoc(doc);
              }}
            />

            {/* New Incoming Document Button (Vibrant Emerald Green) */}
            <button
              id="log-incoming-btn"
              onClick={() => setIsIncomingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md ring-1 ring-emerald-400/40 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Log Incoming</span>
            </button>
          </div>

        </div>
      </header>

      {/* Primary Workspace Navigation Tabs (Deep Navy sub-bar with crisp accents) */}
      <div className="bg-[#08182b] border-t border-[#132c48] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              id="tab-documents-btn"
              onClick={() => setActiveTab('documents')}
              className={`inline-flex items-center gap-2 py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'documents'
                  ? 'border-amber-400 text-white bg-[#0e2a4a] shadow-xs'
                  : 'border-transparent text-blue-200/70 hover:text-white hover:bg-[#0c2340]/60'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Document Registry</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#14365d] text-blue-100 border border-blue-700/50">
                {documents.length}
              </span>
            </button>

            <button
              id="tab-analytics-btn"
              onClick={() => setActiveTab('analytics')}
              className={`inline-flex items-center gap-2 py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'border-emerald-400 text-white bg-[#0e2a4a] shadow-xs'
                  : 'border-transparent text-blue-200/70 hover:text-white hover:bg-[#0c2340]/60'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Analytics & Management Charts</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                recharts
              </span>
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {activeTab === 'documents' ? (
              <button
                onClick={() => setActiveTab('analytics')}
                className="inline-flex items-center gap-1.5 text-xs text-blue-100 hover:text-white bg-[#102e52] hover:bg-[#163d6b] px-3 py-1.5 rounded-xl border border-[#204975] transition-all cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Executive Charts View</span>
                <ChevronRight className="w-3 h-3 text-blue-300" />
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('documents')}
                className="inline-flex items-center gap-1.5 text-xs text-blue-100 hover:text-white bg-[#102e52] hover:bg-[#163d6b] px-3 py-1.5 rounded-xl border border-[#204975] transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Back to Registry Table</span>
                <ChevronRight className="w-3 h-3 text-blue-300" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === 'analytics' ? (
          <DocumentAnalyticsDashboard
            documents={documents}
            staffList={staffList}
            onSelectDocument={(doc) => setSelectedDoc(doc)}
          />
        ) : (
          <>
        {/* KPI / Dashboard Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          
          {/* 1. Total Monitored - Royal Blue Theme */}
          <div
            onClick={() => setViewMode('all')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              viewMode === 'all'
                ? 'bg-white dark:bg-slate-900 border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-900 dark:text-blue-300">Total Monitored</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-950 dark:text-white mt-2 tracking-tight">{totalCount}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Registry document archive</p>
          </div>

          {/* 2. Active In-Transit - Cyan/Sky Blue Theme */}
          <div
            onClick={() => setViewMode('incoming')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              viewMode === 'incoming'
                ? 'bg-white dark:bg-slate-900 border-sky-600 ring-2 ring-sky-500/20 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-800 dark:text-sky-300">Active In-Transit</span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950 flex items-center justify-center text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-800">
                <Inbox className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-sky-950 dark:text-white mt-2 tracking-tight">{activeInOfficeCount}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Under desk routing & action</p>
          </div>

          {/* 3. Supervisor Remarks - Warm Yellow / Amber Theme */}
          <div
            onClick={() => setViewMode('compliance_needed')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              viewMode === 'compliance_needed'
                ? 'bg-amber-50/40 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-400/30 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Supervisor Remarks</span>
              <div className="w-8 h-8 rounded-lg bg-amber-100/70 dark:bg-amber-950 flex items-center justify-center text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-950 dark:text-white mt-2 tracking-tight">{pendingComplianceCount}</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-1">Require staff compliance</p>
          </div>

          {/* 4. Cleared for Out - Emerald / Forest Green Theme */}
          <div
            onClick={() => setViewMode('outgoing')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              viewMode === 'outgoing'
                ? 'bg-emerald-50/40 dark:bg-emerald-950/30 border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Cleared for Out</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100/70 dark:bg-emerald-950 flex items-center justify-center text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-950 dark:text-white mt-2 tracking-tight">{clearedForOutCount}</p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">Manager sign-off authorized</p>
          </div>

          {/* 5. Overdue Stay - Warning / Alert */}
          <div
            onClick={() => setViewMode(viewMode === 'overdue' ? 'all' : 'overdue')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              viewMode === 'overdue'
                ? 'bg-white dark:bg-slate-900 border-rose-600 ring-2 ring-rose-500/20 shadow-sm'
                : overdueCount > 0
                ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 hover:border-rose-300 shadow-2xs'
                : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${overdueCount > 0 ? 'text-rose-700 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                Overdue Stay
              </span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                  overdueCount > 0 ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Timer className="w-4 h-4" />
              </div>
            </div>
            <p className={`text-2xl font-bold mt-2 tracking-tight ${overdueCount > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {overdueCount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {overdueCount > 0 ? 'Exceeded desk threshold' : 'All desks within SLA'}
            </p>
          </div>

        </div>

        {/* Google Sheet Sync Alert Ribbon (if connected) - Green & Blue Accent */}
        {sheetConfig && (
          <div className="bg-white dark:bg-slate-900 border border-emerald-400/80 dark:border-emerald-700 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-slate-800 dark:text-slate-200 shadow-2xs transition-colors">
            <div className="flex items-center gap-2 truncate">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></div>
              <span className="font-bold text-slate-900 dark:text-white">Google Sheet Active Sync:</span>
              <span className="text-slate-600 dark:text-slate-400 truncate">Records auto-synchronizing with "{sheetConfig.sheetName}"</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={async () => {
                  if (token && sheetConfig) {
                    await syncAllDocumentsToSheet(token, sheetConfig.spreadsheetId, documents, staffList);
                    addNotification('Sheet Re-synced', 'Pushed latest registry rows to Google Sheet', currentUser.name, 'sync', 'SYNC');
                  }
                }}
                className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Push All
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <a
                href={sheetConfig.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200"
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
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-slate-50/50 dark:bg-slate-800/80"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Status Pill Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider whitespace-nowrap mr-1">Filter:</span>
              {[
                { id: 'ALL', label: 'All Status', activeClass: 'bg-[#0c2340] dark:bg-blue-600 text-white border-[#0c2340] dark:border-blue-600' },
                { id: 'Incoming Logged', label: 'Incoming', activeClass: 'bg-blue-600 text-white border-blue-600' },
                { id: 'Under Review', label: 'In Review', activeClass: 'bg-sky-600 text-white border-sky-600' },
                { id: 'Supervisor Comment Needed', label: 'Remarks', activeClass: 'bg-amber-500 text-amber-950 font-bold border-amber-500' },
                { id: 'Cleared for Out', label: 'Cleared Out', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
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
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
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
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600 max-w-[220px] cursor-pointer"
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
              <button
                id="open-analytics-from-toolbar-btn"
                onClick={() => setActiveTab('analytics')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                title="View department volume and priority processing time charts"
              >
                <BarChart3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Executive Charts View</span>
              </button>

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
              <div className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                Showing <strong className="text-slate-900 dark:text-white">{filteredDocuments.length}</strong> of {totalCount} records
              </div>
            </div>
          </div>
        </div>

        {/* Documents Table View - Professional Blue, Green, Yellow & White Theme */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0c2847] dark:bg-slate-950 text-white font-bold uppercase tracking-wider text-[11px] border-b border-[#1b3d64] dark:border-slate-800">
                  <th className="py-3.5 px-4">Tracking Code</th>
                  <th className="py-3.5 px-4">Title & Classification</th>
                  <th className="py-3.5 px-4">Origin & Time Inflow</th>
                  <th className="py-3.5 px-4">Forwarded To & Officer</th>
                  <th className="py-3.5 px-4">Current Desk & Custodian</th>
                  <th className="py-3.5 px-4">Time in Desk</th>
                  <th className="py-3.5 px-4">Lifecycle Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="font-bold text-slate-800 dark:text-slate-200">No documents match filter criteria.</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        Reset filters or click "Log Incoming" to register a new record.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => {
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
                        className={`transition-colors cursor-pointer group ${
                          shouldHighlightOverdue
                            ? 'bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100/80 dark:hover:bg-rose-950/60 border-l-4 border-l-rose-500'
                            : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {/* Tracking # & Priority */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          <span className="group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                            {doc.trackingNumber}
                          </span>
                          <span
                            className={`inline-block ml-2 px-1.5 py-0.2 rounded text-[10px] font-bold ${
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
                            <p className="font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-900 dark:group-hover:text-blue-300">
                              {doc.title}
                            </p>
                            {doc.fileLink && (
                              <a
                                href={doc.fileLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-0.5 p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-md shrink-0 transition-colors"
                                title="Open attached cloud file / drive link"
                              >
                                <Link2 className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                            {doc.documentType}
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
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate max-w-[160px]">{doc.currentLocation}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 pl-4.5 truncate">
                            Holder: {doc.currentCustodian}
                          </p>
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
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
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

                        {/* Status & Indicators */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.8 rounded-full font-bold text-[11px] border whitespace-nowrap ${
                              isCleared
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : hasPendingRemarks
                                ? 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                : doc.currentStatus === 'Under Review'
                                ? 'bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {isCleared ? 'Cleared for Out' : doc.currentStatus}
                          </span>

                          {/* Secondary badges for remarks / compliance */}
                          <div className="flex items-center gap-1 mt-1">
                            {hasPendingRemarks && (
                              <span className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                                <AlertCircle className="w-2.5 h-2.5" /> Supervisor compliance
                              </span>
                            )}
                            {doc.movements?.length > 1 && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                ({doc.movements.length} movements)
                              </span>
                            )}
                          </div>
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
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 hover:border-rose-300 dark:hover:border-rose-700 transition-colors shadow-2xs cursor-pointer"
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
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-800 dark:text-blue-300 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-2xs cursor-pointer"
                            >
                              <span>Open Route</span>
                              <ChevronRight className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
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
      </main>

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
