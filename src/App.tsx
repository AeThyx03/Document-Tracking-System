import React, { useState, useEffect, useMemo } from 'react';
import {
  DocumentItem,
  RealtimeNotification,
  AppUserRole,
  UserRoleType,
  RegistryDropdownOptions,
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
} from './mockData';
import { SheetMetadata, syncAllDocumentsToSheet } from './lib/googleSheets';
import { initAuth, setAccessToken, getAccessToken } from './lib/firebase';
import { User } from 'firebase/auth';
import { NotificationCenter } from './components/NotificationCenter';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { IncomingDocumentModal } from './components/IncomingDocumentModal';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { RolesManagementModal } from './components/RolesManagementModal';
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
} from 'lucide-react';

export default function App() {
  // Authentication & Google Sheets State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sheetConfig, setSheetConfig] = useState<SheetMetadata | null>(null);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);

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
  const [viewMode, setViewMode] = useState<'all' | 'incoming' | 'outgoing' | 'compliance_needed'>('all');

  // Load initial data & Firebase Auth Listener
  useEffect(() => {
    setDocuments(getStoredDocuments());
    setSheetConfig(getStoredSheetConfig());

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

    // Initial system ready notification
    addNotification(
      'System Initialized',
      `Document registry active under ${currentUser.role} mode. Monitoring all inflows & dispatches.`,
      'System',
      'incoming',
      'SYS-READY'
    );

    return () => unsubscribe();
  }, []);

  // Save documents on update
  useEffect(() => {
    if (documents.length > 0) {
      saveStoredDocuments(documents);
    }
  }, [documents]);

  // Save staff members on update
  const handleAddStaffMember = (newStaff: AppUserRole) => {
    const updated = [...staffList, newStaff];
    setStaffList(updated);
    saveStoredStaffMembers(updated);
    addNotification(
      'Personnel Registered',
      `${newStaff.name} assigned to ${newStaff.division} as ${newStaff.role}.`,
      currentUser.name,
      'movement',
      'STAFF-REG'
    );
  };

  const handleUpdateStaffRole = (staffId: string, newRole: UserRoleType) => {
    const updated = staffList.map((s) => (s.id === staffId ? { ...s, role: newRole } : s));
    setStaffList(updated);
    saveStoredStaffMembers(updated);
    if (currentUser.id === staffId) {
      setCurrentUser((prev) => ({ ...prev, role: newRole }));
    }
    addNotification(
      'Role Reassigned',
      `Staff role updated to ${newRole}.`,
      currentUser.name,
      'movement',
      'ROLE-UPDATE'
    );
  };

  const handleDeleteStaffMember = (staffId: string) => {
    if (staffList.length <= 1) {
      addNotification(
        'Action Restricted',
        'Cannot remove the last remaining staff member in the system.',
        currentUser.name,
        'sync',
        'STAFF-DELETE-ERROR'
      );
      return;
    }

    const staffToDelete = staffList.find((s) => s.id === staffId);
    const updated = staffList.filter((s) => s.id !== staffId);
    setStaffList(updated);
    saveStoredStaffMembers(updated);

    // If deleting active session user, smoothly switch to next available staff member
    if (currentUser.id === staffId || currentUser.name === staffToDelete?.name) {
      const nextUser = updated[0];
      setCurrentUser(nextUser);
      addNotification(
        'Staff Removed & Session Switched',
        `${staffToDelete?.name || 'Staff'} removed. Active session switched to ${nextUser.name} (${nextUser.role}).`,
        nextUser.name,
        'movement',
        'STAFF-DEL'
      );
    } else {
      addNotification(
        'Staff Member Removed',
        `${staffToDelete?.name || 'Staff'} removed from the directory.`,
        currentUser.name,
        'movement',
        'STAFF-DEL'
      );
    }
  };

  const handleUpdateDropdownOptions = (newOptions: RegistryDropdownOptions) => {
    setDropdownOptions(newOptions);
    saveStoredDropdownOptions(newOptions);
    addNotification(
      'Dropdown Options Updated',
      'Custom entries for staff enrollment dropdowns have been updated.',
      currentUser.name,
      'movement',
      'DROPDOWN-UPDATE'
    );
  };

  const handleQuickSwitchRole = (targetRole: UserRoleType) => {
    // Find staff member with this role or switch active role
    const matched = staffList.find((s) => s.role === targetRole);
    if (matched) {
      setCurrentUser(matched);
    } else {
      setCurrentUser((prev) => ({ ...prev, role: targetRole }));
    }
    addNotification(
      'Session Role Switched',
      `Active view changed to ${targetRole}.`,
      currentUser.name,
      'movement',
      'SWITCH-ROLE'
    );
  };

  const addNotification = (
    title: string,
    message: string,
    actor: string,
    type: RealtimeNotification['type'],
    trackingNumber: string
  ) => {
    const notif: RealtimeNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      title,
      message,
      actor,
      type,
      trackingNumber,
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // HANDLER: Add new incoming document
  const handleCreateDocument = async (newDoc: DocumentItem) => {
    const updatedList = [newDoc, ...documents];
    setDocuments(updatedList);
    saveStoredDocuments(updatedList);

    addNotification(
      'Incoming Document Logged',
      `"${newDoc.title}" registered from ${newDoc.originDepartment} at ${newDoc.timeReceived}. Assigned to ${newDoc.responsiblePerson}.`,
      currentUser.name,
      'incoming',
      newDoc.trackingNumber
    );

    // If Google Sheet is connected and token available, auto-sync in background
    if (token && sheetConfig?.spreadsheetId) {
      try {
        await syncAllDocumentsToSheet(token, sheetConfig.spreadsheetId, updatedList);
        addNotification(
          'Google Sheet Synced',
          `Document ${newDoc.trackingNumber} automatically synced into connected Google Sheet.`,
          'System Sync',
          'sync',
          newDoc.trackingNumber
        );
      } catch (err) {
        console.error('Auto sync error:', err);
      }
    }
  };

  // HANDLER: Update existing document (movement, supervisor remark, compliance, clearance)
  const handleUpdateDocument = async (updatedDoc: DocumentItem, actionSummary: string) => {
    const updatedList = documents.map((d) => (d.id === updatedDoc.id ? updatedDoc : d));
    setDocuments(updatedList);
    saveStoredDocuments(updatedList);
    setSelectedDoc(updatedDoc);

    // Determine notification category
    let type: RealtimeNotification['type'] = 'movement';
    if (actionSummary.includes('remark')) type = 'remark';
    if (actionSummary.includes('Compliance')) type = 'compliance';
    if (actionSummary.includes('CLEARED')) type = 'clearance';

    addNotification(
      'Status & Location Updated',
      `${actionSummary} [${updatedDoc.currentStatus}]`,
      currentUser.name,
      type,
      updatedDoc.trackingNumber
    );

    // If Google Sheet is connected, update row
    if (token && sheetConfig?.spreadsheetId) {
      try {
        await syncAllDocumentsToSheet(token, sheetConfig.spreadsheetId, updatedList);
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

    // If currently opened in detail modal, close it
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

    // If Google Sheet is connected and token available, sync deletion
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

  const currentRoleConfig = getRoleConfig(currentUser.role);
  const canDeleteLogs = canUserDeleteDocuments(currentUser.role);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Sleek Dark Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-3 text-white shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5">
          
          {/* Brand & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm ring-1 ring-indigo-400/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">
                  Office Document Tracking Registry
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Sleek Interface
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Desk Routing, Supervisor Remarks & Compliance, Manager Clearance & Google Sheets
              </p>
            </div>
          </div>

          {/* User Session Profile, Role Switcher, Google Sheet & Action Buttons */}
          <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Active User Pill with Role Indicator */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {currentUser.avatarInitials || currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-100 max-w-[130px] truncate">
                    {currentUser.name}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${currentRoleConfig.badgeBg} ${currentRoleConfig.badgeText} ${currentRoleConfig.badgeBorder}`}>
                    {currentUser.role}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 truncate max-w-[170px]">
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
                className="bg-slate-700/80 text-slate-200 text-xs rounded-lg px-2 py-1 font-medium border border-slate-600 focus:outline-none cursor-pointer"
                title="Switch active user to experience permissions across staff, supervisor, and manager"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Manage Roles Modal Trigger */}
            <button
              id="open-roles-btn"
              onClick={() => setIsRolesModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition-all shadow-2xs"
              title="Open Staff Roles & Permission Matrix"
            >
              <UserCog className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Roles</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-300">
                {staffList.length}
              </span>
            </button>

            {/* Google Sheets Sync Trigger */}
            <button
              id="open-sheet-sync-btn"
              onClick={() => setIsSheetModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shadow-2xs ${
                sheetConfig
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/80'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <FileSpreadsheet className={`w-4 h-4 ${sheetConfig ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">
                {sheetConfig ? 'Sheet Linked' : 'Connect Sheet'}
              </span>
              {sheetConfig && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
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

            {/* New Incoming Document Button */}
            <button
              id="log-incoming-btn"
              onClick={() => setIsIncomingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Log Incoming</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* KPI / Dashboard Summary Cards - Sleek Theme */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          <div
            onClick={() => setViewMode('all')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              viewMode === 'all'
                ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
                : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Monitored</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">{totalCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Registry document archive</p>
          </div>

          <div
            onClick={() => setViewMode('incoming')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              viewMode === 'incoming'
                ? 'bg-white border-sky-600 ring-2 ring-sky-500/20 shadow-xs'
                : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-700">Active In-Transit</span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700">
                <Inbox className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-sky-950 mt-2 tracking-tight">{activeInOfficeCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Under desk routing & action</p>
          </div>

          <div
            onClick={() => setViewMode('compliance_needed')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              viewMode === 'compliance_needed'
                ? 'bg-white border-amber-600 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700">Supervisor Remarks</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-950 mt-2 tracking-tight">{pendingComplianceCount}</p>
            <p className="text-[11px] text-amber-700 mt-1">Require staff compliance</p>
          </div>

          <div
            onClick={() => setViewMode('outgoing')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              viewMode === 'outgoing'
                ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">Cleared for Out</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-950 mt-2 tracking-tight">{clearedForOutCount}</p>
            <p className="text-[11px] text-emerald-700 mt-1">Manager sign-off authorized</p>
          </div>

        </div>

        {/* Google Sheet Sync Alert Ribbon (if connected) */}
        {sheetConfig && (
          <div className="bg-white border border-emerald-300/80 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-slate-800 shadow-2xs">
            <div className="flex items-center gap-2 truncate">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
              <span className="font-bold text-slate-900">Google Sheet Active Sync:</span>
              <span className="text-slate-600 truncate">Records auto-synchronizing with "{sheetConfig.sheetName}"</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={async () => {
                  if (token && sheetConfig) {
                    await syncAllDocumentsToSheet(token, sheetConfig.spreadsheetId, documents);
                    addNotification('Sheet Re-synced', 'Pushed latest registry rows to Google Sheet', currentUser.name, 'sync', 'SYNC');
                  }
                }}
                className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Push All
              </button>
              <span className="text-slate-300">|</span>
              <a
                href={sheetConfig.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900"
              >
                Open File <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Search, Filter Bar & Controls */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5">
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
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Status Pill Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap mr-1">Filter:</span>
              {[
                { id: 'ALL', label: 'All Status' },
                { id: 'Incoming Logged', label: 'Incoming' },
                { id: 'Under Review', label: 'In Review' },
                { id: 'Supervisor Comment Needed', label: 'Remarks' },
                { id: 'Cleared for Out', label: 'Cleared Out' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap border transition-all ${
                    statusFilter === s.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

          </div>

          {/* Secondary Dropdown Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="Routine">Routine</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Rush">Rush</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Target Division:</span>
                <select
                  value={divisionFilter}
                  onChange={(e) => setDivisionFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none max-w-[220px]"
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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold shadow-2xs">
                  <Trash2 className="w-3 h-3 text-rose-600 shrink-0" />
                  <span>Log Deletion Allowed ({currentUser.role})</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 text-[11px]">
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>Log Deletion: System Admin & Dept Mgr Only</span>
                </span>
              )}
              <div className="text-slate-500 text-xs font-medium">
                Showing <strong className="text-slate-900">{filteredDocuments.length}</strong> of {totalCount} records
              </div>
            </div>
          </div>
        </div>

        {/* Documents Table View - Sleek Theme */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Tracking Code</th>
                  <th className="py-3.5 px-4">Title & Classification</th>
                  <th className="py-3.5 px-4">Origin & Time Inflow</th>
                  <th className="py-3.5 px-4">Forwarded To & Officer</th>
                  <th className="py-3.5 px-4">Current Desk & Custodian</th>
                  <th className="py-3.5 px-4">Lifecycle Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-800">No documents match filter criteria.</p>
                      <p className="text-xs text-slate-400 mt-0.5">
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

                    return (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        {/* Tracking # & Priority */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          <span className="group-hover:text-indigo-600 transition-colors">
                            {doc.trackingNumber}
                          </span>
                          <span
                            className={`inline-block ml-2 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              doc.priority === 'Rush'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : doc.priority === 'Urgent'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {doc.priority}
                          </span>
                        </td>

                        {/* Title & Type */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-900">
                            {doc.title}
                          </p>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">
                            {doc.documentType}
                          </span>
                        </td>

                        {/* Origin Department & Auto Timestamp */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800 truncate max-w-[180px]">
                            {doc.originDepartment}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {doc.dateReceived} • {doc.timeReceived}
                            </span>
                          </div>
                        </td>

                        {/* Target Division & Responsible Person */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900 truncate max-w-[180px]">
                            {doc.targetDivision}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-indigo-600" />
                            <span className="truncate">{doc.responsiblePerson}</span>
                          </p>
                        </td>

                        {/* Current Location & Custodian */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-slate-800 font-semibold">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="truncate max-w-[160px]">{doc.currentLocation}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 pl-4.5 truncate">
                            Holder: {doc.currentCustodian}
                          </p>
                        </td>

                        {/* Status & Indicators */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.8 rounded-full font-bold text-[11px] border whitespace-nowrap ${
                              isCleared
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : hasPendingRemarks
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : doc.currentStatus === 'Under Review'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isCleared ? 'Cleared for Out' : doc.currentStatus}
                          </span>

                          {/* Secondary badges for remarks / compliance */}
                          <div className="flex items-center gap-1 mt-1">
                            {hasPendingRemarks && (
                              <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5">
                                <AlertCircle className="w-2.5 h-2.5" /> Supervisor compliance
                              </span>
                            )}
                            {doc.movements?.length > 1 && (
                              <span className="text-[10px] text-slate-400">
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
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span
                                title="Entry deletion strictly restricted to System Admins & Department Manager"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200/70 text-slate-300 bg-slate-50 cursor-not-allowed"
                              >
                                <Lock className="w-3.5 h-3.5 text-slate-300" />
                              </span>
                            )}

                            <button
                              id={`view-doc-${doc.trackingNumber}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDoc(doc);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer"
                            >
                              <span>Open Route</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
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

      </main>

      {/* Modal: Staff Roles & Permission Matrix Management */}
      <RolesManagementModal
        isOpen={isRolesModalOpen}
        onClose={() => setIsRolesModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={(u) => setCurrentUser(u)}
        staffList={staffList}
        onAddStaffMember={handleAddStaffMember}
        onUpdateStaffRole={handleUpdateStaffRole}
        onDeleteStaffMember={handleDeleteStaffMember}
        documents={documents}
        dropdownOptions={dropdownOptions}
        onUpdateDropdownOptions={handleUpdateDropdownOptions}
      />

      {/* Modal: New Incoming Document Form */}
      <IncomingDocumentModal
        isOpen={isIncomingModalOpen}
        onClose={() => setIsIncomingModalOpen(false)}
        onSubmit={handleCreateDocument}
        currentUser={currentUser}
        availableDivisions={dropdownOptions.departments}
      />

      {/* Modal: Document Detail, Internal Routing, Supervisor Remarks & Manager Clearance */}
      <DocumentDetailModal
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        currentUser={currentUser}
        onUpdateDocument={handleUpdateDocument}
        onSwitchRole={handleQuickSwitchRole}
        onDeleteDocument={(doc) => setDocToDelete(doc)}
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
        onNotify={(title, msg, type) =>
          addNotification(title, msg, currentUser.name, type, 'SHEET-SYNC')
        }
      />

      {/* Modal: Delete Document Confirmation (System Admin & Department Manager) */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Delete Document Log Entry
                  </h3>
                  <p className="text-xs text-rose-800 font-medium">
                    Authorized Action: System Admin & Department Manager Only
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete this document from the registry logs? This action will remove all internal tracking history, routing records, supervisor remarks, and linked Google Sheet rows.
              </p>

              {/* Target Document Summary Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {docToDelete.trackingNumber}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      docToDelete.managerClearance?.isCleared || docToDelete.currentStatus === 'Cleared for Out'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-sky-50 text-sky-700 border-sky-200'
                    }`}
                  >
                    {docToDelete.managerClearance?.isCleared || docToDelete.currentStatus === 'Cleared for Out'
                      ? 'Outgoing Registry'
                      : 'Incoming Registry'}
                  </span>
                </div>

                <div className="font-semibold text-slate-800 line-clamp-2">
                  {docToDelete.title}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-500">
                  <div>
                    <span className="text-slate-400 block">Classification:</span>
                    <span className="text-slate-700 font-medium">{docToDelete.documentType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Originating Dept:</span>
                    <span className="text-slate-700 font-medium truncate block">{docToDelete.originDepartment}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Received Timestamp:</span>
                    <span className="text-slate-700 font-medium">{docToDelete.dateReceived} • {docToDelete.timeReceived}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Current Status:</span>
                    <span className="text-slate-700 font-medium">{docToDelete.currentStatus}</span>
                  </div>
                </div>
              </div>

              {/* Role Audit Verification Badge */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Operator Authorization:</span> You are deleting as{' '}
                  <strong className="text-slate-900">{currentUser.name}</strong> (<span className="text-amber-800 font-semibold">{currentUser.role}</span>). This event is permanently recorded in the system notification and sync trail.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
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
