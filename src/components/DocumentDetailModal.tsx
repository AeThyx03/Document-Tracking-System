import React, { useState } from 'react';
import { DocumentItem, InternalMovement, SupervisorRemark, ManagerClearance, AppUserRole, UserRoleType } from '../types';
import { PossdLogo } from './PossdLogo';
import {
  FileText,
  MapPin,
  ArrowRight,
  Send,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock,
  UserCheck,
  ShieldCheck,
  X,
  Plus,
  Check,
  Tag,
  Building,
  User,
  History,
  Calendar,
  AlertTriangle,
  Lock,
  ArrowRightLeft,
  Trash2,
  Sliders,
  Link2,
  ExternalLink,
  Edit3,
} from 'lucide-react';
import { canUserDeleteDocuments } from '../mockData';
import { TimeInDeskConfig } from '../types';
import { calculateDocumentTimeInDesk, DEFAULT_TIME_IN_DESK_CONFIG } from '../lib/timeInDesk';

interface DocumentDetailModalProps {
  document: DocumentItem | null;
  onClose: () => void;
  currentUser: AppUserRole;
  onUpdateDocument: (updated: DocumentItem, notificationMessage: string) => void;
  onSwitchRole?: (role: UserRoleType) => void;
  onDeleteDocument?: (doc: DocumentItem) => void;
  timeInDeskConfig?: TimeInDeskConfig;
  onConfigureThreshold?: () => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  onClose,
  currentUser,
  onUpdateDocument,
  onSwitchRole,
  onDeleteDocument,
  timeInDeskConfig,
  onConfigureThreshold,
}) => {
  if (!document) return null;

  const canDelete = canUserDeleteDocuments(currentUser.role);
  const timeMetrics = calculateDocumentTimeInDesk(document, timeInDeskConfig || DEFAULT_TIME_IN_DESK_CONFIG);

  const [activeTab, setActiveTab] = useState<'movements' | 'remarks' | 'clearance'>('movements');

  // --- 1. Movement form state ---
  const [currentDeskInput, setCurrentDeskInput] = useState(document.currentLocation);
  const [forwardToInput, setForwardToInput] = useState('');
  const [movementAction, setMovementAction] = useState<InternalMovement['statusUpdate']>('forwarded');
  const [movementNotes, setMovementNotes] = useState('');

  // --- 2. Supervisor Remark form state ---
  const [remarkText, setRemarkText] = useState('');
  const [complianceRequired, setComplianceRequired] = useState(true);
  const [complianceInputNotes, setComplianceInputNotes] = useState<{ [remarkId: string]: string }>({});

  // --- 3. Manager Clearance form state ---
  const [clearanceType, setClearanceType] = useState<NonNullable<ManagerClearance['clearanceType']>>('approved_for_dispatch');
  const [exitTrackingNumber, setExitTrackingNumber] = useState(
    document.managerClearance?.exitTrackingNumber || `OUT-${document.trackingNumber.replace('TRK-', '')}`
  );
  const [forwardedToExternal, setForwardedToExternal] = useState(
    document.managerClearance?.forwardedToExternal || document.originDepartment
  );
  const [clearanceRemarks, setClearanceRemarks] = useState(
    document.managerClearance?.clearanceRemarks || ''
  );

  // --- 4. File link state ---
  const [isEditingFileLink, setIsEditingFileLink] = useState(false);
  const [fileLinkInput, setFileLinkInput] = useState(document.fileLink || '');

  const handleSaveFileLink = () => {
    const updated: DocumentItem = {
      ...document,
      fileLink: fileLinkInput.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    onUpdateDocument(updated, `Updated attached file link for ${document.trackingNumber}`);
    setIsEditingFileLink(false);
  };

  // Status badge styling helper
  const getStatusColor = (status: DocumentItem['currentStatus']) => {
    switch (status) {
      case 'Cleared for Out':
      case 'Dispatched / Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Supervisor Comment Needed':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Complied / Ready for Clearance':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Under Review':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-sky-50 text-sky-700 border-sky-200';
    }
  };

  // HANDLER: Record new internal movement
  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDeskInput.trim() || !forwardToInput.trim()) return;

    const nowIso = new Date().toISOString();
    const newMovement: InternalMovement = {
      id: `mov-${Date.now()}`,
      timestamp: nowIso,
      personnelName: currentUser.name,
      personnelRole: currentUser.role,
      currentDesk: currentDeskInput.trim(),
      forwardToDesk: forwardToInput.trim(),
      statusUpdate: movementAction,
      notes: movementNotes.trim(),
    };

    let nextStatus = document.currentStatus;
    if (document.currentStatus === 'Incoming Logged') {
      nextStatus = 'Under Review';
    }

    const updated: DocumentItem = {
      ...document,
      currentLocation: forwardToInput.trim(),
      currentCustodian: currentUser.name,
      currentStatus: nextStatus,
      updatedAt: nowIso,
      movements: [newMovement, ...(document.movements || [])],
    };

    const notif = `Moved from "${currentDeskInput}" to "${forwardToInput}" by ${currentUser.name}`;
    onUpdateDocument(updated, notif);

    // Reset movement inputs
    setCurrentDeskInput(forwardToInput.trim());
    setForwardToInput('');
    setMovementNotes('');
  };

  // HANDLER: Add supervisor remark
  const handleAddSupervisorRemark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarkText.trim()) return;

    const nowIso = new Date().toISOString();
    const newRemark: SupervisorRemark = {
      id: `rem-${Date.now()}`,
      supervisorName: currentUser.name,
      timestamp: nowIso,
      remarkText: remarkText.trim(),
      complianceRequired,
      complied: false,
    };

    const updated: DocumentItem = {
      ...document,
      currentStatus: complianceRequired ? 'Supervisor Comment Needed' : document.currentStatus,
      updatedAt: nowIso,
      supervisorRemarks: [newRemark, ...(document.supervisorRemarks || [])],
    };

    const notif = `Supervisor remark added by ${currentUser.name}: "${remarkText.slice(0, 45)}..."`;
    onUpdateDocument(updated, notif);
    setRemarkText('');
  };

  // HANDLER: Mark supervisor remark as complied
  const handleMarkComplied = (remarkId: string) => {
    const note = complianceInputNotes[remarkId] || 'Complied and verified requirements.';
    const nowIso = new Date().toISOString();

    const updatedRemarks = (document.supervisorRemarks || []).map((r) => {
      if (r.id === remarkId) {
        return {
          ...r,
          complied: true,
          compliedAt: nowIso,
          compliedBy: currentUser.name,
          complianceNotes: note,
        };
      }
      return r;
    });

    // Check if all remarks requiring compliance are now complied
    const allComplied = updatedRemarks.every((r) => !r.complianceRequired || r.complied);

    const updated: DocumentItem = {
      ...document,
      supervisorRemarks: updatedRemarks,
      currentStatus: allComplied ? 'Complied / Ready for Clearance' : document.currentStatus,
      updatedAt: nowIso,
    };

    const notif = `Compliance completed by ${currentUser.name} for remark #${remarkId.slice(-4)}`;
    onUpdateDocument(updated, notif);
  };

  // HANDLER: Manager Clearance (Clear document for Out / Dispatch)
  const handleClearDocument = (e: React.FormEvent) => {
    e.preventDefault();
    const nowIso = new Date().toISOString();

    const updatedClearance: ManagerClearance = {
      isCleared: true,
      clearedBy: currentUser.name,
      clearedAt: nowIso,
      clearanceType,
      exitTrackingNumber: exitTrackingNumber.trim(),
      forwardedToExternal: forwardedToExternal.trim(),
      clearanceRemarks: clearanceRemarks.trim(),
    };

    const updated: DocumentItem = {
      ...document,
      managerClearance: updatedClearance,
      currentStatus: clearanceType === 'approved_for_dispatch' ? 'Cleared for Out' : 'Dispatched / Completed',
      currentLocation: 'Outbox / Dispatch Station',
      updatedAt: nowIso,
    };

    const notif = `Document CLEARED FOR OUT by Manager ${currentUser.name} (${clearanceType})`;
    onUpdateDocument(updated, notif);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Banner - Institutional Navy & White Palette */}
        <div className="px-6 py-4 border-b border-[#1b3d64] dark:border-slate-800 bg-[#0c2340] dark:bg-[#071526] text-white flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-amber-400/50 mt-0.5">
              <PossdLogo className="w-8 h-8" variant="black" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-blue-950 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                  {document.trackingNumber}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(document.currentStatus)}`}>
                  {document.currentStatus}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-900/60 dark:bg-blue-950 text-blue-200 border border-blue-700/50 dark:border-blue-800 font-medium">
                  {document.documentType}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold ${
                    document.priority === 'Rush'
                      ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200'
                      : document.priority === 'Urgent'
                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200'
                      : 'bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200'
                  }`}
                >
                  {document.priority} Priority
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                {document.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 text-base font-medium transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Metadata Strip */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">From (Origin):</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate block" title={document.originDepartment}>
              {document.originDepartment}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">Received Time:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {document.dateReceived} @ {document.timeReceived}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">Target Division:</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate block">
              {document.targetDivision}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block font-medium">Responsible Officer:</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate block">
              {document.responsiblePerson}
            </span>
          </div>
        </div>

        {/* Attached File Link Ribbon - Blue & Green Accent */}
        <div className="px-6 py-2.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/50 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
              <Link2 className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-200 shrink-0">Attached Digital File:</span>
            {isEditingFileLink ? (
              <div className="flex items-center gap-1.5 flex-1 max-w-xl">
                <input
                  type="url"
                  value={fileLinkInput}
                  onChange={(e) => setFileLinkInput(e.target.value)}
                  placeholder="Paste URL (e.g., https://drive.google.com/...)"
                  className="text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-blue-300 dark:border-blue-700 rounded-lg px-2.5 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={handleSaveFileLink}
                  className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[11px] font-semibold shrink-0 cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingFileLink(false);
                    setFileLinkInput(document.fileLink || '');
                  }}
                  className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] shrink-0 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : document.fileLink ? (
              <div className="flex items-center gap-2 min-w-0">
                <a
                  href={document.fileLink}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 underline truncate max-w-xs sm:max-w-md flex items-center gap-1 font-medium"
                >
                  <span>{document.fileLink}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                <button
                  onClick={() => setIsEditingFileLink(true)}
                  className="text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 p-0.5 rounded hover:bg-blue-100/60 dark:hover:bg-blue-900/60 cursor-pointer"
                  title="Edit link"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 dark:text-slate-500 italic">No cloud file link attached</span>
                <button
                  onClick={() => setIsEditingFileLink(true)}
                  className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-semibold underline text-[11px] cursor-pointer"
                >
                  + Add File Link
                </button>
              </div>
            )}
          </div>
          {document.fileLink && !isEditingFileLink && (
            <a
              href={document.fileLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors shrink-0"
            >
              <span>Open File</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Active Role Indicator Banner */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Session Active User:</span>
            <span className="font-bold text-slate-800 dark:text-white">{currentUser.name}</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {currentUser.role}
            </span>
          </div>
          {onSwitchRole && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="hidden sm:inline">Switch Role perspective:</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Admin Staff')}
                className={`hover:underline font-semibold cursor-pointer ${currentUser.role === 'Admin Staff' || currentUser.role === 'Receiving Staff' ? 'text-blue-700 dark:text-blue-400 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Admin Staff
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Staff')}
                className={`hover:underline font-semibold cursor-pointer ${currentUser.role === 'Staff' || currentUser.role === 'Personnel / Handler' ? 'text-blue-700 dark:text-blue-400 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Staff
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Supervisor')}
                className={`hover:underline font-semibold cursor-pointer ${currentUser.role === 'Supervisor' ? 'text-amber-700 dark:text-amber-400 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Supervisor
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Division Manager')}
                className={`hover:underline font-semibold cursor-pointer ${currentUser.role === 'Division Manager' ? 'text-blue-700 dark:text-blue-400 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Division Mgr
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Department Manager')}
                className={`hover:underline font-semibold cursor-pointer ${currentUser.role === 'Department Manager' ? 'text-emerald-700 dark:text-emerald-400 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Dept Mgr
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('System Admin')}
                className={`hover:underline font-semibold cursor-pointer ${currentUser.role === 'System Admin' || currentUser.role === 'Records Administrator' ? 'text-blue-900 dark:text-blue-300 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                System Admin
              </button>
            </div>
          )}
        </div>

        {/* Time-in-Desk & Division Threshold Banner */}
        <div
          className={`px-6 py-3 border-b text-xs transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            timeMetrics.isOverdue
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200'
              : timeMetrics.isCleared
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                timeMetrics.isOverdue
                  ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 ring-2 ring-rose-300 dark:ring-rose-800 animate-pulse'
                  : timeMetrics.isCleared
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              {timeMetrics.isOverdue ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              ) : timeMetrics.isCleared ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">Time-in-Desk Metric:</span>
                
                {/* Metric Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono font-bold text-xs border ${
                    timeMetrics.isOverdue
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                      : timeMetrics.isCleared
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{timeMetrics.elapsedFormatted}</span>
                </span>

                {timeMetrics.isOverdue ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[10px] uppercase tracking-wide">
                    Exceeded Limit (+{timeMetrics.overdueFormatted})
                  </span>
                ) : !timeMetrics.isCleared ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span>Within Threshold ({timeMetrics.remainingFormatted} left)</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    Cleared Out
                  </span>
                )}
              </div>

              <p
                className={`text-[11px] leading-relaxed ${
                  timeMetrics.isOverdue ? 'text-rose-800 dark:text-rose-300 font-medium' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {timeMetrics.isOverdue ? (
                  <>
                    <strong className="text-rose-950 dark:text-rose-100 font-bold">Overdue Alert:</strong> Document has remained in{' '}
                    <strong className="text-rose-950 dark:text-rose-100 font-bold">{document.targetDivision}</strong> (Desk:{' '}
                    <em>{document.currentLocation}</em>) beyond the configured threshold limit of{' '}
                    <span className="font-mono font-bold underline">{timeMetrics.thresholdHours} hours</span> by{' '}
                    <strong className="text-rose-950 dark:text-rose-100">{timeMetrics.overdueFormatted}</strong>. Immediate desk action or forward routing is recommended.
                  </>
                ) : timeMetrics.isCleared ? (
                  <>
                    Document tracking cycle complete. Total dwell duration before final managerial clearance was{' '}
                    <strong>{timeMetrics.elapsedFormatted}</strong>.
                  </>
                ) : (
                  <>
                    Currently stationed at <strong>{document.currentLocation}</strong> in{' '}
                    <strong>{document.targetDivision}</strong>. Allowable division threshold:{' '}
                    <span className="font-mono font-bold">{timeMetrics.thresholdHours} hours</span>.
                  </>
                )}
              </p>
            </div>
          </div>

          {onConfigureThreshold && (
            <button
              type="button"
              onClick={onConfigureThreshold}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                timeMetrics.isOverdue
                  ? 'border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-800 dark:text-rose-300 shadow-2xs'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Threshold</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs - Clean Blue/Yellow/Green Palette */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('movements')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'movements'
                ? 'border-blue-700 dark:border-blue-500 text-blue-800 dark:text-blue-300 bg-blue-50/40 dark:bg-blue-950/40 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            Internal Tracking & Forwarding ({document.movements?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('remarks')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'remarks'
                ? 'border-amber-500 dark:border-amber-400 text-amber-900 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/40 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Supervisor Remarks & Compliance ({document.supervisorRemarks?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('clearance')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'clearance'
                ? 'border-emerald-600 dark:border-emerald-500 text-emerald-900 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/40 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Department Manager Clearance
            {document.managerClearance?.isCleared && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>
        </div>

        {/* Tab Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: INTERNAL MOVEMENTS & FORWARDING */}
          {activeTab === 'movements' && (
            <div className="space-y-6">
              
              {/* Add New Movement Form (Accessible to all handling personnel) */}
              <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-300">
                    Update Current Location & Forward to Next Desk
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                  Any office personnel handling this physical document can update where it is currently and specify which desk or officer it will be forwarded to next.
                </p>

                <form onSubmit={handleAddMovement} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Where is the document CURRENTLY?
                      </label>
                      <input
                        type="text"
                        required
                        value={currentDeskInput}
                        onChange={(e) => setCurrentDeskInput(e.target.value)}
                        placeholder="e.g. Desk 4 - Accounting Evaluation"
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Where to NEXT? (Forward Destination)
                      </label>
                      <input
                        type="text"
                        required
                        value={forwardToInput}
                        onChange={(e) => setForwardToInput(e.target.value)}
                        placeholder="e.g. Legal Counsel Desk / Room 304"
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Action Taken
                      </label>
                      <select
                        value={movementAction}
                        onChange={(e) => setMovementAction(e.target.value as any)}
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      >
                        <option value="forwarded">Forwarded to next desk</option>
                        <option value="in_review">Currently examining / in review</option>
                        <option value="acted">Action endorsed / processed</option>
                        <option value="received">Handed over & received</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Movement Remarks / Routing Instructions
                      </label>
                      <input
                        type="text"
                        value={movementNotes}
                        onChange={(e) => setMovementNotes(e.target.value)}
                        placeholder="e.g. Attached voucher summary; for signature by Atty. Torres"
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Logging as: <strong>{currentUser.name}</strong> ({currentUser.role})
                    </span>
                    <button
                      type="submit"
                      id="log-movement-btn"
                      className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Log Movement & Transfer
                    </button>
                  </div>
                </form>
              </div>

              {/* Movement History Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-4">
                  Internal Route & Desk Audit Trail
                </h4>
                {(!document.movements || document.movements.length === 0) ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">No movement recorded yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                    {document.movements.map((m, idx) => (
                      <div key={m.id || idx} className="relative group">
                        {/* Dot indicator */}
                        <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 ring-2 ring-blue-200 dark:ring-blue-900" />
                        
                        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                              <span className="text-slate-700 dark:text-slate-300">{m.currentDesk}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span className="text-blue-800 dark:text-blue-300 font-bold">{m.forwardToDesk}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {new Date(m.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              Personnel: {m.personnelName} {m.personnelRole ? `(${m.personnelRole})` : ''}
                            </span>
                            <span>•</span>
                            <span className="capitalize text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                              {m.statusUpdate.replace('_', ' ')}
                            </span>
                          </div>

                          {m.notes && (
                            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-700/60 italic">
                              "{m.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: SUPERVISOR REMARKS & COMPLIANCE */}
          {activeTab === 'remarks' && (
            <div className="space-y-6">
              
              {/* Role Awareness Banner for Supervisor Remarks */}
              {currentUser.role !== 'Supervisor' && currentUser.role !== 'Division Manager' && currentUser.role !== 'Department Manager' && currentUser.role !== 'System Admin' && currentUser.role !== 'Records Administrator' && (
                <div className="p-3 bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60 rounded-xl text-xs text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                    <span>
                      Notice: Official directives and compliance instructions are issued by <strong>Supervisors</strong> and <strong>Division Managers</strong>. You are currently logged in as <strong>{currentUser.name}</strong> ({currentUser.role}).
                    </span>
                  </div>
                  {onSwitchRole && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSwitchRole('Supervisor')}
                        className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Switch to Supervisor
                      </button>
                      <button
                        type="button"
                        onClick={() => onSwitchRole('Division Manager')}
                        className="px-3 py-1 bg-violet-700 hover:bg-violet-800 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Switch to Division Mgr
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Supervisor Remark Entry Form */}
              <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    Add Supervisor Comments / Compliance Requirements
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                  Supervisors can record instructions or deficiencies that must be complied with before the document is allowed to move to manager clearance.
                </p>

                <form onSubmit={handleAddSupervisorRemark} className="space-y-3">
                  <div>
                    <textarea
                      id="supervisor-remark-input"
                      required
                      rows={3}
                      value={remarkText}
                      onChange={(e) => setRemarkText(e.target.value)}
                      placeholder="e.g. Needs revision on Annex B: Verify matching fund codes with the Regional Director endorsement."
                      className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={complianceRequired}
                        onChange={(e) => setComplianceRequired(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-600 text-amber-600 focus:ring-amber-500"
                      />
                      <span>Strict Compliance Required (Blocks Manager Clearance until complied)</span>
                    </label>

                    <button
                      type="submit"
                      id="submit-remark-btn"
                      className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Post Supervisor Remark
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Supervisor Remarks & Compliance Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Compliance Tracking Log
                </h4>

                {(!document.supervisorRemarks || document.supervisorRemarks.length === 0) ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                    No supervisor remarks have been issued for this document.
                  </div>
                ) : (
                  document.supervisorRemarks.map((remark) => (
                    <div
                      key={remark.id}
                      className={`p-4 rounded-xl border transition-all ${
                        remark.complianceRequired && !remark.complied
                          ? 'border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {remark.supervisorName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(remark.timestamp).toLocaleString()}
                          </span>
                        </div>

                        {remark.complianceRequired ? (
                          remark.complied ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle className="w-3 h-3" /> Complied
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                              <AlertCircle className="w-3 h-3" /> Compliance Pending
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            Advisory Remark
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                        "{remark.remarkText}"
                      </p>

                      {/* Complied Details or Compliance Action Box */}
                      {remark.complianceRequired && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700">
                          {remark.complied ? (
                            <div className="text-xs text-emerald-800 dark:text-emerald-300 space-y-1 bg-emerald-50/50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              <p className="font-semibold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                Complied by {remark.compliedBy} at {remark.compliedAt ? new Date(remark.compliedAt).toLocaleString() : ''}
                              </p>
                              {remark.complianceNotes && (
                                <p className="text-slate-600 dark:text-slate-400 pl-4">Notes: {remark.complianceNotes}</p>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <input
                                type="text"
                                placeholder="Explain how you complied with this remark (e.g. Attached revised table)..."
                                value={complianceInputNotes[remark.id] || ''}
                                onChange={(e) =>
                                   setComplianceInputNotes({
                                     ...complianceInputNotes,
                                     [remark.id]: e.target.value,
                                   })
                                }
                                className="flex-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleMarkComplied(remark.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Mark as Complied
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 3: DEPARTMENT MANAGER CLEARANCE */}
          {activeTab === 'clearance' && (
            <div className="space-y-6">
              
              {/* Clearance Status Card */}
              {document.managerClearance?.isCleared ? (
                <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                        Document Officially Cleared for Out
                      </h3>
                      <p className="text-xs text-emerald-800 dark:text-emerald-400">
                        Authorized by {document.managerClearance.clearedBy} on{' '}
                        {document.managerClearance.clearedAt
                          ? new Date(document.managerClearance.clearedAt).toLocaleString()
                          : 'Recorded date'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="bg-white/80 dark:bg-slate-800 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                      <span className="text-slate-500 dark:text-slate-400 block font-medium">Clearance Type</span>
                      <span className="font-bold text-slate-800 dark:text-white capitalize">
                        {document.managerClearance.clearanceType?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                      <span className="text-slate-500 dark:text-slate-400 block font-medium">Outgoing Tracking Ref</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">
                        {document.managerClearance.exitTrackingNumber || 'N/A'}
                      </span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
                      <span className="text-slate-500 dark:text-slate-400 block font-medium">Forwarded to External Entity</span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {document.managerClearance.forwardedToExternal || 'Central Archives'}
                      </span>
                    </div>
                  </div>

                  {document.managerClearance.clearanceRemarks && (
                    <div className="bg-white/80 dark:bg-slate-800 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/80 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 block font-medium mb-1">Executive Manager Notes</span>
                      <p className="text-slate-800 dark:text-slate-200 italic">"{document.managerClearance.clearanceRemarks}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Department Manager Clearance Action
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    This section authorizes the final release, dispatch, or official clearance of the document to external agencies or next higher offices.
                  </p>

                  {/* Role Gate Notice for Non-Managers */}
                  {currentUser.role !== 'Department Manager' && currentUser.role !== 'System Admin' && currentUser.role !== 'Records Administrator' && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-950 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <Lock className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block">Department Manager Executive Privilege Required</strong>
                          <p className="text-emerald-800 dark:text-emerald-300 text-[11px] mt-0.5">
                            Executive clearance sign-off is restricted to the Department Manager. You are currently logged in as <strong>{currentUser.name}</strong> ({currentUser.role}).
                          </p>
                        </div>
                      </div>
                      {onSwitchRole && (
                        <button
                          type="button"
                          onClick={() => onSwitchRole('Department Manager')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shrink-0 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Switch to Department Manager
                        </button>
                      )}
                    </div>
                  )}

                  {/* Warning if there are pending compliance items */}
                  {document.supervisorRemarks?.some((r) => r.complianceRequired && !r.complied) && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Notice:</strong> There is at least one supervisor compliance remark still marked as pending. The Department Manager can review compliance under the Supervisor Remarks tab or override if deemed compliant.
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleClearDocument} className="space-y-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Clearance Decision
                        </label>
                        <select
                          value={clearanceType}
                          onChange={(e) => setClearanceType(e.target.value as any)}
                          className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="approved_for_dispatch">Approve for Outgoing Dispatch</option>
                          <option value="archived_completed">Completed & Closed for Archive</option>
                          <option value="returned_for_revision">Return to Sender for Revision</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Outgoing Tracking / Dispatch Number
                        </label>
                        <input
                          type="text"
                          required
                          value={exitTrackingNumber}
                          onChange={(e) => setExitTrackingNumber(e.target.value)}
                          placeholder="e.g. OUT-DISPATCH-2026-092"
                          className="w-full font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        External Entity / Destination Office Forwarded To
                      </label>
                      <input
                        type="text"
                        required
                        value={forwardedToExternal}
                        onChange={(e) => setForwardedToExternal(e.target.value)}
                        placeholder="e.g. Regional Director Office / Central Courier Service"
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Manager Clearance Remarks / Final Directives
                      </label>
                      <textarea
                        rows={2}
                        value={clearanceRemarks}
                        onChange={(e) => setClearanceRemarks(e.target.value)}
                        placeholder="e.g. Approved for release. Transmit physical original via secured courier."
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Signatory: <strong>{currentUser.name}</strong> ({currentUser.role})
                      </span>
                      <button
                        type="submit"
                        id="authorize-clearance-btn"
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Authorize Clearance & Release for Out
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span>Tracking ID: <strong className="font-mono text-slate-700 dark:text-slate-300">{document.trackingNumber}</strong></span>
            
            {/* Delete Option for System Admin and Department Manager */}
            {canDelete ? (
              <button
                type="button"
                id="delete-doc-from-modal-btn"
                onClick={() => {
                  if (onDeleteDocument) {
                    onDeleteDocument(document);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/80 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold transition-colors shadow-2xs cursor-pointer"
                title="Permanently delete this entry (Authorized for System Admin & Department Manager)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Delete Log Entry</span>
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 bg-slate-100/90 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200/80 dark:border-slate-700"
                title="Only System Admins and Department Managers can delete log entries"
              >
                <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                <span>Log deletion restricted to System Admin & Dept Manager</span>
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
