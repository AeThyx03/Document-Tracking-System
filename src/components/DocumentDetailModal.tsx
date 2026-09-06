import React, { useState } from 'react';
import { DocumentItem, InternalMovement, SupervisorRemark, ManagerClearance, AppUserRole, UserRoleType } from '../types';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Banner */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300">
                {document.trackingNumber}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(document.currentStatus)}`}>
                {document.currentStatus}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                {document.documentType}
              </span>
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-rose-100 text-rose-800">
                {document.priority} Priority
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {document.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 text-base font-medium"
          >
            ✕
          </button>
        </div>

        {/* Metadata Strip */}
        <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">From (Origin):</span>
            <span className="font-semibold text-slate-800 truncate block" title={document.originDepartment}>
              {document.originDepartment}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Received Time:</span>
            <span className="font-semibold text-slate-800">
              {document.dateReceived} @ {document.timeReceived}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Target Division:</span>
            <span className="font-semibold text-slate-800 truncate block">
              {document.targetDivision}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Responsible Officer:</span>
            <span className="font-semibold text-slate-800 truncate block">
              {document.responsiblePerson}
            </span>
          </div>
        </div>

        {/* Active Role Indicator Banner */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Session Active User:</span>
            <span className="font-bold text-slate-800">{currentUser.name}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
              {currentUser.role}
            </span>
          </div>
          {onSwitchRole && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span className="hidden sm:inline">Switch Role perspective:</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Admin Staff')}
                className={`hover:underline font-semibold ${currentUser.role === 'Admin Staff' || currentUser.role === 'Receiving Staff' ? 'text-sky-600 underline' : 'text-slate-600'}`}
              >
                Admin Staff
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Staff')}
                className={`hover:underline font-semibold ${currentUser.role === 'Staff' || currentUser.role === 'Personnel / Handler' ? 'text-indigo-600 underline' : 'text-slate-600'}`}
              >
                Staff
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Supervisor')}
                className={`hover:underline font-semibold ${currentUser.role === 'Supervisor' ? 'text-amber-600 underline' : 'text-slate-600'}`}
              >
                Supervisor
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Division Manager')}
                className={`hover:underline font-semibold ${currentUser.role === 'Division Manager' ? 'text-violet-600 underline' : 'text-slate-600'}`}
              >
                Division Mgr
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('Department Manager')}
                className={`hover:underline font-semibold ${currentUser.role === 'Department Manager' ? 'text-emerald-600 underline' : 'text-slate-600'}`}
              >
                Dept Mgr
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onSwitchRole('System Admin')}
                className={`hover:underline font-semibold ${currentUser.role === 'System Admin' || currentUser.role === 'Records Administrator' ? 'text-slate-800 underline' : 'text-slate-600'}`}
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
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : timeMetrics.isCleared
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                timeMetrics.isOverdue
                  ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-300 animate-pulse'
                  : timeMetrics.isCleared
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-indigo-50 text-indigo-700'
              }`}
            >
              {timeMetrics.isOverdue ? (
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              ) : timeMetrics.isCleared ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <Clock className="w-5 h-5 text-indigo-600" />
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-900">Time-in-Desk Metric:</span>
                
                {/* Metric Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono font-bold text-xs border ${
                    timeMetrics.isOverdue
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : timeMetrics.isCleared
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-white text-slate-800 border-slate-300'
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
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                    <span>Within Threshold ({timeMetrics.remainingFormatted} left)</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    Cleared Out
                  </span>
                )}
              </div>

              <p
                className={`text-[11px] leading-relaxed ${
                  timeMetrics.isOverdue ? 'text-rose-800 font-medium' : 'text-slate-500'
                }`}
              >
                {timeMetrics.isOverdue ? (
                  <>
                    <strong className="text-rose-950 font-bold">Overdue Alert:</strong> Document has remained in{' '}
                    <strong className="text-rose-950 font-bold">{document.targetDivision}</strong> (Desk:{' '}
                    <em>{document.currentLocation}</em>) beyond the configured threshold limit of{' '}
                    <span className="font-mono font-bold underline">{timeMetrics.thresholdHours} hours</span> by{' '}
                    <strong className="text-rose-950">{timeMetrics.overdueFormatted}</strong>. Immediate desk action or forward routing is recommended.
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
                  ? 'border-rose-300 bg-white hover:bg-rose-100 text-rose-800 shadow-2xs'
                  : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Threshold</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('movements')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'movements'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            Internal Tracking & Forwarding ({document.movements?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('remarks')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'remarks'
                ? 'border-amber-600 text-amber-700 bg-amber-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Supervisor Remarks & Compliance ({document.supervisorRemarks?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('clearance')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'clearance'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
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
              <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-sky-700" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900">
                    Update Current Location & Forward to Next Desk
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Any office personnel handling this physical document can update where it is currently and specify which desk or officer it will be forwarded to next.
                </p>

                <form onSubmit={handleAddMovement} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Where is the document CURRENTLY?
                      </label>
                      <input
                        type="text"
                        required
                        value={currentDeskInput}
                        onChange={(e) => setCurrentDeskInput(e.target.value)}
                        placeholder="e.g. Desk 4 - Accounting Evaluation"
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Where to NEXT? (Forward Destination)
                      </label>
                      <input
                        type="text"
                        required
                        value={forwardToInput}
                        onChange={(e) => setForwardToInput(e.target.value)}
                        placeholder="e.g. Legal Counsel Desk / Room 304"
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Action Taken
                      </label>
                      <select
                        value={movementAction}
                        onChange={(e) => setMovementAction(e.target.value as any)}
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="forwarded">Forwarded to next desk</option>
                        <option value="in_review">Currently examining / in review</option>
                        <option value="acted">Action endorsed / processed</option>
                        <option value="received">Handed over & received</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Movement Remarks / Routing Instructions
                      </label>
                      <input
                        type="text"
                        value={movementNotes}
                        onChange={(e) => setMovementNotes(e.target.value)}
                        placeholder="e.g. Attached voucher summary; for signature by Atty. Torres"
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500">
                      Logging as: <strong>{currentUser.name}</strong> ({currentUser.role})
                    </span>
                    <button
                      type="submit"
                      id="log-movement-btn"
                      className="px-4 py-2 bg-sky-700 text-white rounded-xl text-xs font-semibold hover:bg-sky-800 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Log Movement & Transfer
                    </button>
                  </div>
                </form>
              </div>

              {/* Movement History Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
                  Internal Route & Desk Audit Trail
                </h4>
                {(!document.movements || document.movements.length === 0) ? (
                  <p className="text-xs text-slate-500 italic">No movement recorded yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {document.movements.map((m, idx) => (
                      <div key={m.id || idx} className="relative group">
                        {/* Dot indicator */}
                        <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-sky-600 border-2 border-white ring-2 ring-sky-200" />
                        
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                              <span className="text-slate-600">{m.currentDesk}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              <span className="text-sky-700">{m.forwardToDesk}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {new Date(m.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <span className="font-medium text-slate-800">
                              Personnel: {m.personnelName} {m.personnelRole ? `(${m.personnelRole})` : ''}
                            </span>
                            <span>•</span>
                            <span className="capitalize text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-medium">
                              {m.statusUpdate.replace('_', ' ')}
                            </span>
                          </div>

                          {m.notes && (
                            <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
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
                <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-xl text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Notice: Official directives and compliance instructions are issued by <strong>Supervisors</strong> and <strong>Division Managers</strong>. You are currently logged in as <strong>{currentUser.name}</strong> ({currentUser.role}).
                    </span>
                  </div>
                  {onSwitchRole && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSwitchRole('Supervisor')}
                        className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs rounded-lg transition-colors"
                      >
                        Switch to Supervisor
                      </button>
                      <button
                        type="button"
                        onClick={() => onSwitchRole('Division Manager')}
                        className="px-3 py-1 bg-violet-700 hover:bg-violet-800 text-white font-semibold text-xs rounded-lg transition-colors"
                      >
                        Switch to Division Mgr
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Supervisor Remark Entry Form */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-amber-700" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Add Supervisor Comments / Compliance Requirements
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mb-3">
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
                      className="w-full text-xs rounded-xl border border-slate-300 p-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={complianceRequired}
                        onChange={(e) => setComplianceRequired(e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span>Strict Compliance Required (Blocks Manager Clearance until complied)</span>
                    </label>

                    <button
                      type="submit"
                      id="submit-remark-btn"
                      className="px-4 py-2 bg-amber-700 text-white rounded-xl text-xs font-semibold hover:bg-amber-800 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Post Supervisor Remark
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Supervisor Remarks & Compliance Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Compliance Tracking Log
                </h4>

                {(!document.supervisorRemarks || document.supervisorRemarks.length === 0) ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                    No supervisor remarks have been issued for this document.
                  </div>
                ) : (
                  document.supervisorRemarks.map((remark) => (
                    <div
                      key={remark.id}
                      className={`p-4 rounded-xl border transition-all ${
                        remark.complianceRequired && !remark.complied
                          ? 'border-amber-300 bg-amber-50/60'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-500" />
                          <span className="text-xs font-bold text-slate-900">
                            {remark.supervisorName}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(remark.timestamp).toLocaleString()}
                          </span>
                        </div>

                        {remark.complianceRequired ? (
                          remark.complied ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" /> Complied
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              <AlertCircle className="w-3 h-3" /> Compliance Pending
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            Advisory Remark
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-slate-800 font-medium leading-relaxed">
                        "{remark.remarkText}"
                      </p>

                      {/* Complied Details or Compliance Action Box */}
                      {remark.complianceRequired && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80">
                          {remark.complied ? (
                            <div className="text-xs text-emerald-800 space-y-1 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200">
                              <p className="font-semibold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Complied by {remark.compliedBy} at {remark.compliedAt ? new Date(remark.compliedAt).toLocaleString() : ''}
                              </p>
                              {remark.complianceNotes && (
                                <p className="text-slate-600 pl-4">Notes: {remark.complianceNotes}</p>
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
                                className="flex-1 text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleMarkComplied(remark.id)}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shrink-0 flex items-center justify-center gap-1"
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
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-emerald-950">
                        Document Officially Cleared for Out
                      </h3>
                      <p className="text-xs text-emerald-800">
                        Authorized by {document.managerClearance.clearedBy} on{' '}
                        {document.managerClearance.clearedAt
                          ? new Date(document.managerClearance.clearedAt).toLocaleString()
                          : 'Recorded date'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                      <span className="text-slate-500 block font-medium">Clearance Type</span>
                      <span className="font-bold text-slate-800 capitalize">
                        {document.managerClearance.clearanceType?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                      <span className="text-slate-500 block font-medium">Outgoing Tracking Ref</span>
                      <span className="font-mono font-bold text-slate-800">
                        {document.managerClearance.exitTrackingNumber || 'N/A'}
                      </span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                      <span className="text-slate-500 block font-medium">Forwarded to External Entity</span>
                      <span className="font-bold text-slate-800">
                        {document.managerClearance.forwardedToExternal || 'Central Archives'}
                      </span>
                    </div>
                  </div>

                  {document.managerClearance.clearanceRemarks && (
                    <div className="bg-white/80 p-3 rounded-xl border border-emerald-200 text-xs">
                      <span className="text-slate-500 block font-medium mb-1">Executive Manager Notes</span>
                      <p className="text-slate-800 italic">"{document.managerClearance.clearanceRemarks}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-700" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                      Department Manager Clearance Action
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This section authorizes the final release, dispatch, or official clearance of the document to external agencies or next higher offices.
                  </p>

                  {/* Role Gate Notice for Non-Managers */}
                  {currentUser.role !== 'Department Manager' && currentUser.role !== 'System Admin' && currentUser.role !== 'Records Administrator' && (
                    <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block">Department Manager Executive Privilege Required</strong>
                          <p className="text-emerald-800 text-[11px] mt-0.5">
                            Executive clearance sign-off is restricted to the Department Manager. You are currently logged in as <strong>{currentUser.name}</strong> ({currentUser.role}).
                          </p>
                        </div>
                      </div>
                      {onSwitchRole && (
                        <button
                          type="button"
                          onClick={() => onSwitchRole('Department Manager')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shrink-0 transition-colors shadow-xs flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Switch to Department Manager
                        </button>
                      )}
                    </div>
                  )}

                  {/* Warning if there are pending compliance items */}
                  {document.supervisorRemarks?.some((r) => r.complianceRequired && !r.complied) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Notice:</strong> There is at least one supervisor compliance remark still marked as pending. The Department Manager can review compliance under the Supervisor Remarks tab or override if deemed compliant.
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleClearDocument} className="space-y-4 bg-white p-4 rounded-xl border border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Clearance Decision
                        </label>
                        <select
                          value={clearanceType}
                          onChange={(e) => setClearanceType(e.target.value as any)}
                          className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="approved_for_dispatch">Approve for Outgoing Dispatch</option>
                          <option value="archived_completed">Completed & Closed for Archive</option>
                          <option value="returned_for_revision">Return to Sender for Revision</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Outgoing Tracking / Dispatch Number
                        </label>
                        <input
                          type="text"
                          required
                          value={exitTrackingNumber}
                          onChange={(e) => setExitTrackingNumber(e.target.value)}
                          placeholder="e.g. OUT-DISPATCH-2026-092"
                          className="w-full font-mono text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        External Entity / Destination Office Forwarded To
                      </label>
                      <input
                        type="text"
                        required
                        value={forwardedToExternal}
                        onChange={(e) => setForwardedToExternal(e.target.value)}
                        placeholder="e.g. Regional Director Office / Central Courier Service"
                        className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Manager Clearance Remarks / Final Directives
                      </label>
                      <textarea
                        rows={2}
                        value={clearanceRemarks}
                        onChange={(e) => setClearanceRemarks(e.target.value)}
                        placeholder="e.g. Approved for release. Transmit physical original via secured courier."
                        className="w-full text-xs rounded-xl border border-slate-300 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Signatory: <strong>{currentUser.name}</strong> ({currentUser.role})
                      </span>
                      <button
                        type="submit"
                        id="authorize-clearance-btn"
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
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
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <span>Tracking ID: <strong className="font-mono text-slate-700">{document.trackingNumber}</strong></span>
            
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold transition-colors shadow-2xs cursor-pointer"
                title="Permanently delete this entry (Authorized for System Admin & Department Manager)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Log Entry</span>
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200/80"
                title="Only System Admins and Department Managers can delete log entries"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Log deletion restricted to System Admin & Dept Manager</span>
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
