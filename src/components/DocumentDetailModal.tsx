import React, { useState } from 'react';
import { DocumentItem, InternalMovement, SupervisorRemark, ManagerClearance, AppUserRole, UserRoleType, getSortedMovements, formatDateToMDY } from '../types';
import {
  WorkflowActor,
  recordDocumentMovement,
  addSupervisorRemark,
  fulfillSupervisorCompliance,
  applyManagerClearance,
} from '../lib/workflow';
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
  RefreshCw,
  Trash2,
  Sliders,
  Link2,
  ExternalLink,
  Edit3,
  Printer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { canUserDeleteDocuments } from '../mockData';
import { TimeInDeskConfig } from '../types';
import { calculateDocumentTimeInDesk, DEFAULT_TIME_IN_DESK_CONFIG } from '../lib/timeInDesk';
import { DocumentLifecycleProgress } from './DocumentLifecycleProgress';
import { DocumentAuditTrail } from './DocumentAuditTrail';
import { compileDocumentAuditTrail } from '../lib/audit';

interface DocumentDetailModalProps {
  document: DocumentItem | null;
  onClose: () => void;
  currentUser?: AppUserRole | null;
  onUpdateDocument: (updated: DocumentItem, notificationMessage: string) => void;
  onSwitchRole?: (role: UserRoleType) => void;
  onDeleteDocument?: (doc: DocumentItem) => void;
  timeInDeskConfig?: TimeInDeskConfig;
  onConfigureThreshold?: () => void;
  dropdownOptions?: any;
  staffList?: AppUserRole[];
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps & { isDistributionDesk?: boolean }> = ({
  document,
  onClose,
  currentUser,
  onUpdateDocument,
  onSwitchRole,
  onDeleteDocument,
  timeInDeskConfig,
  onConfigureThreshold,
  isDistributionDesk,
  dropdownOptions,
  staffList,
}) => {
  if (!document) return null;

  const canDelete = currentUser ? canUserDeleteDocuments(currentUser) : false;
  const timeMetrics = calculateDocumentTimeInDesk(document, timeInDeskConfig || DEFAULT_TIME_IN_DESK_CONFIG);

  const [printTarget, setPrintTarget] = useState<'routing-slip' | 'audit-trail'>('audit-trail');
  const [pendingPrintTarget, setPendingPrintTarget] = useState<'routing-slip' | 'audit-trail' | null>(null);


  // Execute print after React commits printable target DOM element
  React.useEffect(() => {
    if (!pendingPrintTarget) return;

    const targetId = pendingPrintTarget === 'routing-slip' ? 'printable-routing-slip' : 'printable-audit-trail';

    const timer = setTimeout(() => {
      const el = window.document.getElementById(targetId);
      if (!el) {
        console.error(`[Print Controller] Target printable element #${targetId} was not found in the DOM. Aborting print.`);
        setPendingPrintTarget(null);
        return;
      }

      const handleAfterPrint = () => {
        window.removeEventListener('afterprint', handleAfterPrint);
        setPendingPrintTarget(null);
      };
      window.addEventListener('afterprint', handleAfterPrint, { once: true });

      try {
        window.print();
      } catch (err) {
        console.error('[Print Controller] window.print() failed:', err);
        setPendingPrintTarget(null);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [pendingPrintTarget]);

  const executePrint = (target: 'routing-slip' | 'audit-trail') => {
    if (pendingPrintTarget) return;
    setPrintTarget(target);
    setPendingPrintTarget(target);
  };

  const handlePrintSlip = () => {
    executePrint('routing-slip');
  };

  const handlePrintAuditTrail = () => {
    executePrint('audit-trail');
  };

  const totalAuditEvents =
    1 +
    (document.movements?.length || 0) +
    (document.supervisorRemarks?.length || 0) +
    (document.supervisorRemarks?.filter((r) => r.complied).length || 0) +
    (document.managerClearance?.isCleared ? 1 : 0);

  // --- 1. Movement form state ---
  const [currentDeskInput, setCurrentDeskInput] = useState('');
  const [forwardToInput, setForwardToInput] = useState('');
  const [movementAction, setMovementAction] = useState<InternalMovement['statusUpdate']>('forwarded');
  const [movementNotes, setMovementNotes] = useState('');

  // --- 2. Supervisor Remark form state ---
  const [remarkText, setRemarkText] = useState('');
  const [complianceRequired, setComplianceRequired] = useState(true);
  const [complianceInputNotes, setComplianceInputNotes] = useState<{ [remarkId: string]: string }>({});

  // --- 3. Manager Clearance form state ---
  const [showClearanceForm, setShowClearanceForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [showRemarkForm, setShowRemarkForm] = useState(false);
  const [isTrailCollapsed, setIsTrailCollapsed] = useState(true);
  const [clearanceType, setClearanceType] = useState<NonNullable<ManagerClearance['clearanceType']>>('approved_for_dispatch');
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

  // Double-submission protection and inline validation states
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(true); // Collapsed by default to save space and remove scrollbars
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [movementError, setMovementError] = useState<string | null>(null);
  const [remarkError, setRemarkError] = useState<string | null>(null);
  const [clearanceError, setClearanceError] = useState<string | null>(null);
  const [complianceError, setComplianceError] = useState<string | null>(null);

  // HANDLER: Record new internal movement
  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingMovement) return;

    if (!currentDeskInput.trim()) {
      setMovementError('In-charge person is required.');
      return;
    }
    
    // Check if the user really wants to assign
    if (!window.confirm(`Are you sure you want to assign this document to ${currentDeskInput.trim()}?`)) {
      return;
    }

    setMovementError(null);
    setIsSubmittingMovement(true);

    try {
      const actor: WorkflowActor = {
        id: currentUser?.id || 'sys-actor',
        name: currentUser?.name || 'Authorized Custodian',
        role: currentUser?.role || 'Staff',
        division: currentUser?.division || 'General',
      };

      const result = recordDocumentMovement(
        document,
        {
          fromDesk: document.currentLocation,
          toDesk: currentDeskInput.trim(),
          statusUpdate: 'forwarded',
          notes: movementNotes.trim(),
        },
        actor
      );

      if (!result.success) {
        setMovementError(result.error || 'Failed to record movement.');
        return;
      }

      onUpdateDocument(result.document, result.notificationMessage || `Assigned to ${currentDeskInput.trim()}`);
      setMovementNotes('');
    } catch (err: any) {
      setMovementError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmittingMovement(false);
    }
  };

  // HANDLER: Add supervisor remark
  const handleAddSupervisorRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRemark) return;
    if (!remarkText.trim()) {
      setRemarkError('Remark or directive text cannot be empty.');
      return;
    }
    setRemarkError(null);
    setIsSubmittingRemark(true);

    try {
      const actor: WorkflowActor = {
        id: currentUser?.id || 'sys-actor',
        name: currentUser?.name || 'Authorized Custodian',
        role: currentUser?.role || 'Supervisor',
        division: currentUser?.division || 'General',
      };

      const result = addSupervisorRemark(
        document,
        {
          remarkText: remarkText.trim(),
          complianceRequired,
        },
        actor
      );

      if (!result.success) {
        setRemarkError(result.error || 'Failed to add supervisor remark.');
        return;
      }

      onUpdateDocument(result.document, result.notificationMessage || 'Supervisor directive added.');
      setRemarkText('');
    } finally {
      setIsSubmittingRemark(false);
    }
  };

  // HANDLER: Mark supervisor remark as complied
  const handleMarkComplied = (remarkId: string) => {
    const note = complianceInputNotes[remarkId] || 'Complied and verified requirements.';
    const actor: WorkflowActor = {
      id: currentUser?.id || 'sys-actor',
      name: currentUser?.name || 'Authorized Custodian',
      role: currentUser?.role || 'Staff',
      division: currentUser?.division || 'General',
    };

    const result = fulfillSupervisorCompliance(document, remarkId, note, actor);
    if (!result.success) {
      setComplianceError(result.error || 'Failed to record compliance.');
      return;
    }

    setComplianceError(null);
    onUpdateDocument(result.document, result.notificationMessage || 'Compliance fulfilled.');
  };

  // HANDLER: Manager Clearance (Clear document for Out / Dispatch)
  const handleClearDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isClearing) return;
    if (clearanceType === 'returned_for_revision' && !clearanceRemarks.trim()) {
      setClearanceError('Please specify the revisions required before returning.');
      return;
    }
    setClearanceError(null);
    setIsClearing(true);

    try {
      const actor: WorkflowActor = {
        id: currentUser?.id || 'sys-actor',
        name: currentUser?.name || 'Authorized Custodian',
        role: currentUser?.role || 'Department Manager',
        division: currentUser?.division || 'General',
      };

      const result = applyManagerClearance(
        document,
        {
          clearanceType,
          clearanceRemarks: clearanceRemarks.trim(),
        },
        actor
      );

      if (!result.success) {
        setClearanceError(result.error || 'Failed to apply clearance.');
        return;
      }

      onUpdateDocument(result.document, result.notificationMessage || `Clearance updated (${clearanceType})`);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs document-detail-modal-overlay print:p-0 print:m-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 document-detail-modal-container print:max-h-none print:max-w-none print:w-full print:border-none print:shadow-none print:rounded-none print:overflow-visible">
        
        {/* SCREEN VIEW OF DOCUMENT DETAIL MODAL (Hidden when printing) */}
        <div className="flex flex-col flex-1 overflow-hidden print:hidden">
          {/* Modal Top Banner - Professional Slate Grayscale Palette */}
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900 text-white flex items-start justify-between">
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
                  
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/60 dark:bg-emerald-950 text-emerald-200 border border-emerald-700/50 dark:border-emerald-800 font-medium">
                    {document.documentClassification || document.direction || 'Incoming'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-900/60 dark:bg-purple-950 text-purple-200 border border-purple-700/50 dark:border-purple-800 font-medium">
                    {document.transactionType || document.documentType || 'Simple Transaction'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-900/60 dark:bg-blue-950 text-blue-200 border border-blue-700/50 dark:border-blue-800 font-medium">
                    {document.communicationType}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/60 dark:bg-indigo-950 text-indigo-200 border border-indigo-700/50 dark:border-indigo-800 font-medium truncate max-w-[200px]">
                    {document.reportType}
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
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button
                type="button"
                onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                className="no-print inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-lg text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer shadow-xs"
                title={isHeaderCollapsed ? "Expand Document Details" : "Collapse Document Details"}
              >
                {isHeaderCollapsed ? (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Expand Info</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Collapse Info</span>
                  </>
                )}
              </button>
              
              {!isTrailCollapsed ? (
                <button
                  type="button"
                  onClick={handlePrintAuditTrail}
                  id="print-audit-trail-header-btn"
                  className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 text-white rounded-lg text-xs font-semibold border border-blue-600 transition-colors cursor-pointer shadow-xs"
                  title="Print official chronological document audit report (Form POSSD-DTS-AUD01)"
                >
                  <Printer className="w-3.5 h-3.5 text-white" />
                  <span>Print Trail</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  id="print-tracking-slip-btn"
                  className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-100 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer shadow-xs"
                  title="Print official document routing and tracking slip (Form POSSD-DTS-F01)"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-300" />
                  <span>Print Slip</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 text-base font-medium transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

        {/* Collapsible Info Section */}
        {!isHeaderCollapsed && (
          <div className="flex flex-col">
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
                  {formatDateToMDY(document.dateReceived)} @ {document.timeReceived}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Target Division:</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate block">
                  {document.targetDivision}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Focal Person:</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate block">
                  {document.responsiblePerson}
                </span>
              </div>
            </div>

            {/* Visual Progress Steps Indicator */}
            <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <DocumentLifecycleProgress document={document} variant="detailed" onExpandHistory={() => setIsTrailCollapsed(false)} />
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
                      placeholder="Paste URL (e.g., https://storage.agency.gov/file/...)"
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
          </div>
        )}

        {/* Active Role Indicator Banner */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Session Active User:</span>
            <span className="font-bold text-slate-800 dark:text-white">{currentUser?.name || 'Authorized Custodian'}</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {currentUser?.role || 'Staff'}
            </span>
          </div>
          {onSwitchRole && currentUser?.role === 'System Admin' && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="hidden sm:inline">Switch Role perspective:</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Receiving')}
                className={`hover:underline font-semibold cursor-pointer ${(currentUser?.role as string) === 'Receiving' ? 'text-blue-700 dark:text-blue-400 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Admin Staff
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Staff')}
                className={`hover:underline font-semibold cursor-pointer ${(currentUser?.role as string) === 'Staff' ? 'text-blue-700 dark:text-blue-400 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Staff
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Supervisor')}
                className={`hover:underline font-semibold cursor-pointer ${(currentUser?.role as string) === 'Supervisor' ? 'text-amber-700 dark:text-amber-400 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Supervisor
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Division Manager')}
                className={`hover:underline font-semibold cursor-pointer ${(currentUser?.role as string) === 'Division Manager' ? 'text-blue-700 dark:text-blue-400 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Division Mgr
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('System Admin')}
                className={`hover:underline font-semibold cursor-pointer ${(currentUser?.role as string) === 'System Admin' ? 'text-blue-900 dark:text-blue-300 underline font-bold' : 'text-slate-600 dark:text-slate-400'}`}
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
                  ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 ring-2 ring-rose-300 dark:ring-rose-800'
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
                    <strong className="text-rose-950 dark:text-rose-100 font-bold">{document.targetDivision}</strong> beyond the configured threshold limit of{' '}
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
                    Currently stationed in{' '}
                    <strong>{document.targetDivision}</strong>. Allowable division threshold:{' '}
                    <span className="font-mono font-bold">{timeMetrics.thresholdHours} hours</span>.
                  </>
                )}
              </p>
            </div>
        </div>
          </div>


                        {/* Action Bar */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-slate-50 dark:bg-slate-900 shrink-0">
          <button
            onClick={() => {
               setShowMovementForm(!showMovementForm);
               setShowRemarkForm(false);
               setShowClearanceForm(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer ${showMovementForm ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-slate-700'}`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Log New Movement
          </button>

          <button
            onClick={() => {
               setShowRemarkForm(!showRemarkForm);
               setShowMovementForm(false);
               setShowClearanceForm(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer ${showRemarkForm ? 'bg-amber-600 text-white' : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-slate-700'}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Add Directive
          </button>
          
          {(currentUser?.role === 'Department Manager' || currentUser?.role === 'System Admin') && !document.managerClearance?.isCleared && (
            <button
              type="button"
              onClick={() => {
                setShowClearanceForm(!showClearanceForm);
                setShowMovementForm(false);
                setShowRemarkForm(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer ${showClearanceForm ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-slate-700'}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Clearance Action
            </button>
          )}

          <button
            onClick={() => setIsTrailCollapsed(!isTrailCollapsed)}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <History className="w-3.5 h-3.5" />
            {isTrailCollapsed ? 'Show Document Trail' : 'Hide Document Trail'}
          </button>
        </div>        {/* Tab Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!showClearanceForm && (
          <>
          
          {/* CHRONOLOGICAL AUDIT TRAIL */}
          {!isTrailCollapsed && (
            <DocumentAuditTrail
              document={document}
              currentUser={currentUser}
              onPrintAudit={handlePrintAuditTrail}
            />
          )}

          {/* INTERNAL MOVEMENTS & FORWARDING */}
          {showMovementForm && (
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
                  {movementError && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>{movementError}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        In-charge
                      </label>
                      <select
                        required
                        value={currentDeskInput}
                        onChange={(e) => setCurrentDeskInput(e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      >
                        <option value="">Select Staff...</option>
                        {staffList?.filter(s => s.role === 'Staff').map(staff => (
                          <option key={staff.id} value={staff.name}>{staff.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Remarks / Handover Instructions
                      </label>
                      <select
                        required
                        value={movementNotes}
                        onChange={(e) => setMovementNotes(e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      >
                        <option value="">Select instructions...</option>
                        {(dropdownOptions?.handoverInstructions?.length ? dropdownOptions.handoverInstructions : [
                          'For your information and reference',
                          'For your appropriate action',
                          'For review and recommendation',
                          'For compliance',
                          'For signature / approval',
                          'For filing / archiving'
                        ]).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Logging as: <strong>{currentUser?.name || 'Authorized Custodian'}</strong> ({currentUser?.role || 'Staff'})
                    </span>
                    <button
                      type="submit"
                      id="log-movement-transfer-btn"
                      disabled={isSubmittingMovement || !currentDeskInput || !movementNotes}
                      className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      {isSubmittingMovement ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Assigning...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Assign</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Movement History Timeline */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Internal Route & Desk Movements
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsTrailCollapsed(false)}
                    className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>View Unified Chronological Audit Trail ({totalAuditEvents} events) ➔</span>
                  </button>
                </div>
                {(!document.movements || document.movements.length === 0) ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">No movement recorded yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                    {getSortedMovements(document.movements, 'desc').map((m, idx) => (
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

          {/* SUPERVISOR REMARKS & COMPLIANCE */}
          {showRemarkForm && (
            <div className="space-y-6">
              
              {/* Role Awareness Banner for Supervisor Remarks */}
              {currentUser?.role !== 'Supervisor' && currentUser?.role !== 'Division Manager' && currentUser?.role !== 'Department Manager' && currentUser?.role !== 'System Admin' && (
                <div className="p-3 bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60 rounded-xl text-xs text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                    <span>
                      Notice: Official directives and compliance instructions are issued by <strong>Supervisors</strong> and <strong>Division Managers</strong>. You are currently logged in as <strong>{currentUser?.name || 'Guest User'}</strong> ({currentUser?.role || 'Staff'}).
                    </span>
                  </div>
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
                  {remarkError && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>{remarkError}</span>
                    </div>
                  )}
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
                      disabled={isSubmittingRemark}
                      className="px-4 py-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      {isSubmittingRemark ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Posting...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Post Supervisor Remark</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Supervisor Remarks & Compliance Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Compliance Tracking Log
                </h4>

                {complianceError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>{complianceError}</span>
                  </div>
                )}

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

                    </>
        )}

        {/* CLEARANCE ACTION VIEW */}
        {showClearanceForm && (
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
                  {currentUser?.role !== 'Department Manager' && currentUser?.role !== 'System Admin' && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-950 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <Lock className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block">Department Manager Executive Privilege Required</strong>
                          <p className="text-emerald-800 dark:text-emerald-300 text-[11px] mt-0.5">
                            Executive clearance sign-off is restricted to the Department Manager. You are currently logged in as <strong>{currentUser?.name || 'Guest User'}</strong> ({currentUser?.role || 'Staff'}).
                          </p>
                        </div>
                      </div>
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
                    {clearanceError && (
                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                        <span>{clearanceError}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-4">
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
                      
                      <button
                        type="submit"
                        id="authorize-clearance-btn"
                        disabled={isClearing}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        {isClearing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Authorizing Clearance...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>Authorize Clearance & Release for Out</span>
                          </>
                        )}
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
      {/* END OF SCREEN VIEW */}

      {/* =====================================================================
          OFFICIAL PRINTER-FRIENDLY ROUTING SLIP (Form POSSD-DTS-F01)
          ===================================================================== */}
      {printTarget === 'routing-slip' && (
        <div id="printable-routing-slip" className="hidden print:block w-full p-4 bg-white text-black font-sans text-xs">
          {/* Official Government / Division Letterhead */}
          <div className="border-b-2 border-slate-900 pb-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PossdLogo className="w-12 h-12 text-black" variant="black" />
                <div>
                  <p className="text-[10px] tracking-widest uppercase font-semibold text-slate-600">Republic of the Philippines</p>
                  <h1 className="text-sm font-black tracking-wide uppercase text-black">
                    Provincial Operations &amp; Strategic Services Division (POSSD)
                  </h1>
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                    Official Document Tracking &amp; Routing Slip
                  </h2>
                  <p className="text-[9px] text-slate-500 font-mono">Form No. POSSD-DTS-F01 &bull; ISO-Compliant Quality Management Record</p>
                </div>
              </div>
              <div className="text-right">
                <div className="border-2 border-black px-3 py-1 bg-slate-100 rounded text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Tracking Code</p>
                  <p className="font-mono text-base font-black text-black">{document.trackingNumber}</p>
                </div>
                <p className="text-[9px] text-slate-500 mt-1">
                  Printed: {new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                  {new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })} PST
                </p>
              </div>
            </div>
          </div>

          {/* Section I: Document Profile & Classification Matrix */}
          <div className="mb-3 border border-slate-400 rounded overflow-hidden print-avoid-break">
            <div className="bg-slate-200 px-3 py-1 font-bold text-[11px] uppercase border-b border-slate-400">
              I. Document Profile &amp; Basic Classification
            </div>
            <div className="p-2.5 grid grid-cols-4 gap-2 text-xs">
              <div className="col-span-4 border-b border-slate-200 pb-1.5 mb-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Document Title / Subject:</span>
                <span className="text-sm font-bold text-black">{document.title}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Document Classification:</span>
                <span className="font-semibold text-black">{document.documentClassification || document.direction || 'Incoming'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Transaction Type:</span>
                <span className="font-semibold text-black">{document.transactionType || document.documentType || 'Simple Transaction'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Communication Type:</span>
                <span className="font-semibold text-black">{document.communicationType}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Report Classification:</span>
                <span className="font-semibold text-black">{document.reportType}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Priority Level:</span>
                <span className="font-bold text-black uppercase">{document.priority} Priority</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Originating Office / Sender:</span>
                <span className="font-semibold text-black">{document.originDepartment}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Date &amp; Time Received:</span>
                <span className="font-semibold text-black">{formatDateToMDY(document.dateReceived)} at {document.timeReceived}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Target Division:</span>
                <span className="font-semibold text-black">{document.targetDivision}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Assigned Focal Person:</span>
                <span className="font-semibold text-black">{document.responsiblePerson}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Lifecycle Status:</span>
                <span className="font-bold text-black">{document.currentStatus}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Desk Location:</span>
                <span className="font-semibold text-black">{document.currentLocation}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Custodian:</span>
                <span className="font-semibold text-black">{document.currentCustodian}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Processing Duration / SLA:</span>
                <span className="font-semibold text-black">
                  {timeMetrics.elapsedFormatted} ({timeMetrics.isOverdue ? 'OVERDUE' : 'Within SLA'})
                </span>
              </div>
              {document.fileLink && (
                <div className="col-span-4 border-t border-slate-200 pt-1 mt-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Digital Record Reference:</span>
                  <span className="font-mono text-[10px] text-slate-800 break-all">{document.fileLink}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section II: Internal Routing & Custody Movement History */}
          <div className="mb-3 border border-slate-400 rounded overflow-hidden print-avoid-break">
            <div className="bg-slate-200 px-3 py-1 font-bold text-[11px] uppercase border-b border-slate-400 flex justify-between items-center">
              <span>II. Internal Movement &amp; Custody Transfer History</span>
              <span className="text-[10px] text-slate-600 font-normal">({document.movements?.length || 0} Recorded Movements)</span>
            </div>
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                  <th className="p-1.5 border-r border-slate-300 w-8 text-center">#</th>
                  <th className="p-1.5 border-r border-slate-300 w-28">Timestamp (PST)</th>
                  <th className="p-1.5 border-r border-slate-300 w-32">From Desk / Station</th>
                  <th className="p-1.5 border-r border-slate-300 w-32">Forwarded To</th>
                  <th className="p-1.5 border-r border-slate-300 w-32">Custodian &amp; Role</th>
                  <th className="p-1.5 border-r border-slate-300 w-24">Action</th>
                  <th className="p-1.5">Action Notes / Routing Instructions</th>
                </tr>
              </thead>
              <tbody>
                {document.movements && document.movements.length > 0 ? (
                  getSortedMovements(document.movements).map((m, idx) => (
                    <tr key={m.id} className="border-b border-slate-200">
                      <td className="p-1.5 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="p-1.5 border-r border-slate-200 font-mono text-[9px]">
                        {new Date(m.timestamp).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })}{' '}
                        {new Date(m.timestamp).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 font-medium">{m.currentDesk}</td>
                      <td className="p-1.5 border-r border-slate-200 font-semibold">{m.forwardToDesk}</td>
                      <td className="p-1.5 border-r border-slate-200">
                        {m.personnelName} <span className="text-[9px] text-slate-500">({m.personnelRole})</span>
                      </td>
                      <td className="p-1.5 border-r border-slate-200 font-medium uppercase text-[9px]">{m.statusUpdate}</td>
                      <td className="p-1.5 italic text-slate-700">{m.notes || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-2 text-center text-slate-500 italic">
                      Initial incoming intake logged at {document.currentLocation}. No subsequent forwarding recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section III: Supervisor Directives & Compliance Action */}
          <div className="mb-3 border border-slate-400 rounded overflow-hidden print-avoid-break">
            <div className="bg-slate-200 px-3 py-1 font-bold text-[11px] uppercase border-b border-slate-400 flex justify-between items-center">
              <span>III. Supervisory Directives &amp; Compliance Action</span>
              <span className="text-[10px] text-slate-600 font-normal">({document.supervisorRemarks?.length || 0} Directives)</span>
            </div>
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                  <th className="p-1.5 border-r border-slate-300 w-8 text-center">#</th>
                  <th className="p-1.5 border-r border-slate-300 w-28">Supervisor &amp; Date</th>
                  <th className="p-1.5 border-r border-slate-300">Directive / Instructions</th>
                  <th className="p-1.5 border-r border-slate-300 w-20 text-center">Required</th>
                  <th className="p-1.5 border-r border-slate-300 w-20 text-center">Status</th>
                  <th className="p-1.5 w-44">Compliance Action / Verification</th>
                </tr>
              </thead>
              <tbody>
                {document.supervisorRemarks && document.supervisorRemarks.length > 0 ? (
                  document.supervisorRemarks.map((r, idx) => (
                    <tr key={r.id} className="border-b border-slate-200">
                      <td className="p-1.5 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="p-1.5 border-r border-slate-200">
                        <span className="font-bold block">{r.supervisorName}</span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(r.timestamp).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })}{' '}
                          {new Date(r.timestamp).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="p-1.5 border-r border-slate-200 font-medium">{r.remarkText}</td>
                      <td className="p-1.5 border-r border-slate-200 text-center font-semibold">
                        {r.complianceRequired ? 'YES' : 'INFO'}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-center">
                        <span className={`font-bold px-1.5 py-0.2 rounded text-[9px] ${r.complied ? 'bg-slate-200 text-black border border-black' : 'bg-slate-100 text-slate-700'}`}>
                          {r.complied ? 'COMPLIED' : 'PENDING'}
                        </span>
                      </td>
                      <td className="p-1.5 text-[9px]">
                        {r.complied ? (
                          <div>
                            <span className="font-semibold text-black">By: {r.compliedBy || 'Assigned Staff'}</span>
                            <p className="italic text-slate-600">{r.complianceNotes || 'Action verified.'}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Awaiting compliance</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-2 text-center text-slate-500 italic">
                      No supervisory directives or action remarks issued for this document.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section IV: Division Manager Clearance & Final Authorization */}
          <div className="mb-3 border border-slate-400 rounded overflow-hidden print-avoid-break">
            <div className="bg-slate-200 px-3 py-1 font-bold text-[11px] uppercase border-b border-slate-400">
              IV. Division Manager Clearance &amp; Final Release Authorization
            </div>
            <div className="p-2.5 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Clearance Status:</span>
                <span className="font-bold text-black">
                  {document.managerClearance?.isCleared ? '✓ APPROVED & CLEARED FOR RELEASE' : 'PENDING MANAGER CLEARANCE'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Clearance Action Type:</span>
                <span className="font-semibold text-black">
                  {document.managerClearance?.clearanceType ? document.managerClearance.clearanceType.replace(/_/g, ' ').toUpperCase() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Cleared / Authorized By:</span>
                <span className="font-bold text-black">{document.managerClearance?.clearedBy || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Date &amp; Time Cleared:</span>
                <span className="font-mono text-black">
                  {document.managerClearance?.clearedAt
                    ? `${new Date(document.managerClearance.clearedAt).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })} ${new Date(document.managerClearance.clearedAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}`
                    : '—'}
                </span>
              </div>
              {document.managerClearance?.clearanceRemarks && (
                <div className="col-span-3 border-t border-slate-200 pt-1 mt-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Manager Endorsement / Release Remarks:</span>
                  <p className="italic text-slate-800">{document.managerClearance.clearanceRemarks}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section V: Sign-off & Chain-of-Custody Certification */}
          <div className="mb-3 border border-slate-400 rounded overflow-hidden print-avoid-break">
            <div className="bg-slate-200 px-3 py-1 font-bold text-[11px] uppercase border-b border-slate-400">
              V. Custody Chain Certification &amp; Sign-off
            </div>
            <div className="p-4 grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-600 mb-8">1. Received &amp; Logged By:</p>
                <div className="border-b border-black mx-4 mb-1"></div>
                <p className="font-bold text-black">{document.responsiblePerson || 'Receiving'}</p>
                <p className="text-[9px] text-slate-500">Administrative Receiving Officer</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-600 mb-8">2. Reviewed &amp; Actioned By:</p>
                <div className="border-b border-black mx-4 mb-1"></div>
                <p className="font-bold text-black">
                  {document.supervisorRemarks?.[0]?.supervisorName || 'Supervising Officer'}
                </p>
                <p className="text-[9px] text-slate-500">Technical Supervisor / Section Head</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-600 mb-8">3. Final Clearance Approved By:</p>
                <div className="border-b border-black mx-4 mb-1"></div>
                <p className="font-bold text-black">
                  {document.managerClearance?.clearedBy || 'Division Manager'}
                </p>
                <p className="text-[9px] text-slate-500">Division / Department Manager</p>
              </div>
            </div>
          </div>

          {/* Official Footer Notice */}
          <div className="border-t border-slate-400 pt-2 flex justify-between items-center text-[9px] text-slate-500 font-mono">
            <span>POSSD-DTS &bull; Form POSSD-DTS-F01 &bull; Confidential &amp; For Official Use Only</span>
            <span>Printed by: {currentUser?.name || 'Authorized Personnel'} ({currentUser?.role || 'Staff'})</span>
          </div>
        </div>
      )}

      {/* =====================================================================
          OFFICIAL PRINTER-FRIENDLY CHRONOLOGICAL AUDIT TRAIL (Form POSSD-DTS-AUD01)
          ===================================================================== */}
      {printTarget === 'audit-trail' && (
        <div id="printable-audit-trail" className="hidden print:block w-full p-4 bg-white text-black font-sans text-xs">
          {/* Official Government Letterhead */}
          <div className="border-b-2 border-slate-900 pb-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PossdLogo className="w-12 h-12 text-black" variant="black" />
                <div>
                  <p className="text-[10px] tracking-widest uppercase font-semibold text-slate-600">Republic of the Philippines</p>
                  <h1 className="text-sm font-black tracking-wide uppercase text-black">
                    Provincial Operations &amp; Strategic Services Division (POSSD)
                  </h1>
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                    Official Chronological Document Lifecycle &amp; Audit Trail Report
                  </h2>
                  <p className="text-[9px] text-slate-500 font-mono">Form No. POSSD-DTS-AUD01 &bull; Permanent Quality &amp; Compliance Audit Record</p>
                </div>
              </div>
              <div className="text-right">
                <div className="border-2 border-black px-3 py-1 bg-slate-100 rounded text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Tracking Code</p>
                  <p className="font-mono text-base font-black text-black">{document.trackingNumber}</p>
                </div>
                <p className="text-[9px] text-slate-500 mt-1">
                  Printed: {new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                  {new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })} PST
                </p>
              </div>
            </div>
          </div>

          {/* Section I: Document Information & Classification Matrix */}
          <div className="mb-3 border border-slate-400 rounded overflow-hidden print-avoid-break">
            <div className="bg-slate-200 px-3 py-1 font-bold text-[11px] uppercase border-b border-slate-400 flex justify-between items-center">
              <span>I. Document Profile &amp; Metadata</span>
              <span className="text-[10px] text-slate-600 font-normal">SLA Duration: {timeMetrics.elapsedFormatted} ({timeMetrics.isOverdue ? 'OVERDUE' : 'Within SLA'})</span>
            </div>
            <div className="p-2.5 grid grid-cols-4 gap-2 text-xs">
              <div className="col-span-4 border-b border-slate-200 pb-1.5 mb-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Document Title / Subject:</span>
                <span className="text-sm font-bold text-black">{document.title}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Communication Type:</span>
                <span className="font-semibold text-black">{document.communicationType}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Document Type:</span>
                <span className="font-semibold text-black">{document.documentType}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Classification:</span>
                <span className="font-semibold text-black">{document.reportType}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Priority:</span>
                <span className="font-bold text-black uppercase">{document.priority} Priority</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Originating Office:</span>
                <span className="font-semibold text-black">{document.originDepartment}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Date &amp; Time Received:</span>
                <span className="font-semibold text-black">{formatDateToMDY(document.dateReceived)} at {document.timeReceived}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Location:</span>
                <span className="font-semibold text-black">{document.currentLocation}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Custodian:</span>
                <span className="font-semibold text-black">{document.currentCustodian}</span>
              </div>
            </div>
          </div>

          {/* Section II: Chronological Audit Ledger Table */}
          <div className="mb-3 border border-slate-400 rounded overflow-hidden">
            <div className="bg-slate-200 px-3 py-1 font-bold text-[11px] uppercase border-b border-slate-400 flex justify-between items-center">
              <span>II. Chronological Lifecycle Audit Ledger (Authoritative Historical Record)</span>
              <span className="text-[10px] text-slate-600 font-normal">
                ({compileDocumentAuditTrail(document, 'asc').length} Verified Audit Events)
              </span>
            </div>
            <table className="w-full text-left text-[10px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                  <th className="p-1.5 border-r border-slate-300 w-8 text-center">#</th>
                  <th className="p-1.5 border-r border-slate-300 w-32">Timestamp (PST)</th>
                  <th className="p-1.5 border-r border-slate-300 w-28">Stage / Category</th>
                  <th className="p-1.5 border-r border-slate-300 w-36">Actor &amp; Role</th>
                  <th className="p-1.5 border-r border-slate-300 w-32">Station Routing</th>
                  <th className="p-1.5">Action Details, Directives &amp; Compliance Notes</th>
                </tr>
              </thead>
              <tbody>
                {compileDocumentAuditTrail(document, 'asc').map((event, idx) => (
                  <tr key={event.id} className="border-b border-slate-200">
                    <td className="p-1.5 border-r border-slate-200 text-center font-mono font-bold">{idx + 1}</td>
                    <td className="p-1.5 border-r border-slate-200 font-mono text-[9px]">
                      {new Date(event.timestamp).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                      {new Date(event.timestamp).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <span className="font-semibold uppercase text-[9px] text-black">
                        {event.stageLabel || event.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-1.5 border-r border-slate-200">
                      <span className="font-bold text-black block">{event.actorName}</span>
                      <span className="text-[9px] text-slate-600 font-mono">{event.actorRole}</span>
                    </td>
                    <td className="p-1.5 border-r border-slate-200 text-[9px]">
                      {event.fromDesk || event.toDesk ? (
                        <span>
                          {event.fromDesk || '—'} &rarr; <strong className="text-black">{event.toDesk || '—'}</strong>
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="p-1.5 text-[9.5px]">
                      <p className="font-medium text-black">{event.actionTitle}</p>
                      {event.notes && (
                        <p className="italic text-slate-700 mt-0.5 text-[9px]">Notes: {event.notes}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section III: Audit & Custody Certification Sign-off */}
          <div className="mb-3 border border-slate-400 rounded overflow-hidden print-avoid-break">
            <div className="bg-slate-200 px-3 py-1 font-bold text-[11px] uppercase border-b border-slate-400">
              III. Quality &amp; Compliance Audit Attestation
            </div>
            <div className="p-4 grid grid-cols-3 gap-6 text-center text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-600 mb-8">1. Certified by Records Custodian:</p>
                <div className="border-b border-black mx-4 mb-1"></div>
                <p className="font-bold text-black">{document.responsiblePerson || 'Intake Officer'}</p>
                <p className="text-[9px] text-slate-500">Document Custodian / Administrative Officer</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-600 mb-8">2. Reviewed by Supervising Officer:</p>
                <div className="border-b border-black mx-4 mb-1"></div>
                <p className="font-bold text-black">
                  {document.supervisorRemarks?.[0]?.supervisorName || 'Supervising Officer'}
                </p>
                <p className="text-[9px] text-slate-500">Quality Assurance Reviewer</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-600 mb-8">3. Attested by Division Manager:</p>
                <div className="border-b border-black mx-4 mb-1"></div>
                <p className="font-bold text-black">
                  {document.managerClearance?.clearedBy || 'Division Manager'}
                </p>
                <p className="text-[9px] text-slate-500">Head of Office / Division Manager</p>
              </div>
            </div>
          </div>

          {/* Official Footer Notice */}
          <div className="border-t border-slate-400 pt-2 flex justify-between items-center text-[9px] text-slate-500 font-mono">
            <span>POSSD-DTS &bull; Form POSSD-DTS-AUD01 &bull; Permanent Quality &amp; Compliance Audit Record</span>
            <span>Printed by: {currentUser?.name || 'Authorized Personnel'} ({currentUser?.role || 'Staff'})</span>
          </div>
        </div>
      )}
      {/* END OF PRINTER-FRIENDLY CONTAINERS */}
      </div>
    </div>
  );
};
