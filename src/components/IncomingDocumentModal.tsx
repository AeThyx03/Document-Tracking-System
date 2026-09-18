import React, { useState, useEffect, useMemo } from 'react';
import { DocumentItem, TimeInDeskConfig, RegistryDropdownOptions, generatePOSSDTrackingNumber, AppUserRole, DEFAULT_REGISTRY_DROPDOWN_OPTIONS } from '../types';
import { generateEntityId, reconcileDocumentIntegrity } from '../lib/workflow';
import { apiRequest } from '../lib/api';
import { PossdLogo } from './PossdLogo';
import { PlusCircle, Clock, Hash, Building2, User, Send, Inbox, FileText, AlertTriangle, Timer, Link2, ExternalLink, CheckCircle2, Tag, RefreshCw, AlertCircle, ShieldCheck, UserCheck, Edit3 } from 'lucide-react';
import { getDivisionThreshold, DEFAULT_TIME_IN_DESK_CONFIG } from '../lib/timeInDesk';
import { hasSupervisorPermissions } from '../mockData';

interface IncomingDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newDoc: DocumentItem) => void;
  currentUser?: { name?: string; role?: string; division?: string } | null;
  availableDivisions?: string[];
  dropdownOptions?: RegistryDropdownOptions;
  staffList?: AppUserRole[];
  timeInDeskConfig?: TimeInDeskConfig;
  existingDocuments?: DocumentItem[];
}


const DIVISIONS = [
  'Executive Office of the Manager',
  'Administrative & General Services',
  'Finance & Budget Division',
  'Accounting Section',
  'Planning & Quality Assurance',
  'Operations & Emergency Management',
  'Information Technology Division',
  'Legal & Compliance Bureau',
  'Human Resource Management',
];

export const IncomingDocumentModal: React.FC<IncomingDocumentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUser,
  availableDivisions,
  dropdownOptions,
  timeInDeskConfig,
  staffList = [],
  existingDocuments = [],
}) => {
  
  const [dbOptions, setDbOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingOptions(true);
      apiRequest('/api/dropdown-options/grouped?includeInactive=false')
        .then((data) => {
          setDbOptions(data.dropdownOptions || {});
        })
        .catch(err => {
          console.error("Failed to load options", err);
          setValidationError("Failed to load active dropdown configurations. Please refresh the page.");
        })
        .finally(() => setIsLoadingOptions(false));
    }
  }, [isOpen]);

  const transactionTypeList = useMemo(() => (dbOptions['transaction_type'] || []).map(o => o.value), [dbOptions]);
  const communicationTypeList = useMemo(() => (dbOptions['communication_type'] || []).map(o => o.value), [dbOptions]);
  const reportTypeList = useMemo(() => (dbOptions['report_type'] || []).map(o => o.value), [dbOptions]);
  const originatingAgencyList = useMemo(() => (dbOptions['originating_agency'] || []).map(o => o.value), [dbOptions]);
  const divisionList = useMemo(() => (dbOptions['target_division'] || []).map(o => o.value), [dbOptions]);
  const documentClassificationList = useMemo(() => (dbOptions['document_classification'] || []).map(o => o.value), [dbOptions]);
  const priorityList = useMemo(() => (dbOptions['priority_level'] || []).map(o => o.value), [dbOptions]);


  // Filter enrolled personnel with supervisor permissions
  const enrolledSupervisors = useMemo(() => {
    return (staffList || []).filter(
      (s) => s.status !== 'suspended' && hasSupervisorPermissions(s)
    );
  }, [staffList]);

  // Active focal persons: If system admin designated specific supervisor focal persons in dropdownOptions.focalPersons,
  // use those (validated against supervisor permissions); otherwise include all enrolled supervisors.
  const activeFocalSupervisors = useMemo(() => {
    // 1. Authoritative source: staffList with isFocalPerson === true and status !== suspended
    const designated = (staffList || []).filter(
      (s) => s.status !== 'suspended' && s.isFocalPerson
    );
    if (designated.length > 0) return designated;

    // 2. Fallback: all non-suspended supervisors (if none explicitly designated)
    if (enrolledSupervisors.length > 0) {
      return enrolledSupervisors;
    }

    // 3. Empty fallback
    return [];
  }, [staffList, enrolledSupervisors]);

  // Document Classification: Incoming vs Outgoing
  const [documentClassification, setDocumentClassification] = useState<'Incoming' | 'Outgoing'>('Incoming');
  // Tracking number: auto-generated for incoming, strictly blank and editable for outgoing
  const [trackingNumber, setTrackingNumber] = useState('');
  const [title, setTitle] = useState('');
  // Transaction Type: Simple Transaction, Complex Transaction, etc.
  const [transactionType, setTransactionType] = useState<string>(transactionTypeList[0] || 'Simple Transaction');
  const [communicationType, setCommunicationType] = useState<string>(communicationTypeList[0] || 'Memorandum');
  const [reportType, setReportType] = useState<string>(reportTypeList[0] || 'Inspection Report');
  
  // Originating Dept / Agency state with option for custom typing
  const [originDepartment, setOriginDepartment] = useState(originatingAgencyList[0] || '');
    
  const [dateReceived, setDateReceived] = useState('');
  const [timeReceived, setTimeReceived] = useState('');
  const [targetDivision, setTargetDivision] = useState(divisionList[0] || 'Administration');
  
  // Focal Person state (Selected among enrolled personnel with supervisor permissions)
  const [responsiblePersonId, setResponsiblePersonId] = useState<string>(
    activeFocalSupervisors[0]?.id || ''
  );
  const [priority, setPriority] = useState<string>(priorityList[0] || 'Routine');
  
  const [fileLink, setFileLink] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Update default selections when options change or modal opens
  useEffect(() => {
    if (isOpen) {
      if (transactionTypeList.length > 0 && !transactionTypeList.includes(transactionType)) {
        setTransactionType(transactionTypeList[0]);
      }
      if (communicationTypeList.length > 0 && !communicationTypeList.includes(communicationType)) {
        setCommunicationType(communicationTypeList[0]);
      }
      if (reportTypeList.length > 0 && !reportTypeList.includes(reportType)) {
        setReportType(reportTypeList[0]);
      }
      if (originatingAgencyList.length > 0 && !originatingAgencyList.includes(originDepartment)) {
        setOriginDepartment(originatingAgencyList[0]);
      }
      if (documentClassificationList.length > 0 && !documentClassificationList.includes(documentClassification as any)) {
        setDocumentClassification(documentClassificationList[0] as any);
      }
      if (priorityList.length > 0 && !priorityList.includes(priority as any)) {
        setPriority(priorityList[0] as any);
      }
      if (divisionList.length > 0 && !divisionList.includes(targetDivision)) {
        setTargetDivision(divisionList[0]);
      }
      if (activeFocalSupervisors.length > 0 && !activeFocalSupervisors.some(s => s.id === responsiblePersonId)) {
        setResponsiblePersonId(activeFocalSupervisors[0].id);
      }
    }
  }, [isOpen, transactionTypeList, communicationTypeList, reportTypeList, originatingAgencyList, divisionList, documentClassificationList, priorityList, activeFocalSupervisors]);

  // Clock tick to automatically show current date and time upon opening
  useEffect(() => {
    if (isOpen) {
      setValidationError(null);
      setIsSubmitting(false);
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');

      setDateReceived(`${yyyy}-${mm}-${dd}`);
      setTimeReceived(`${hh}:${min}:${ss}`);

      if (documentClassification === 'Incoming') {
        // Auto tracking number for incoming: POSSD-YYYY-MM-XXXX
        setTrackingNumber(generatePOSSDTrackingNumber(existingDocuments));
      } else {
        // Outgoing is blank so user can type into it
        setTrackingNumber('');
      }
    }
  }, [isOpen]);

  const handleClassificationChange = (newClassification: 'Incoming' | 'Outgoing') => {
    setDocumentClassification(newClassification);
    setValidationError(null);
    if (newClassification === 'Outgoing') {
      // User specifically requested: tracking number is blank and can be typed into if outgoing document is selected
      setTrackingNumber('');
    } else {
      // If switching back to Incoming, generate an auto ID if blank or was empty
      if (!trackingNumber.trim()) {
        setTrackingNumber(generatePOSSDTrackingNumber(existingDocuments));
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!trackingNumber.trim()) {
      setValidationError('Tracking number is required.');
      return;
    }

    if (existingDocuments.some(d => d.trackingNumber.trim().toUpperCase() === trackingNumber.trim().toUpperCase())) {
      setValidationError(`Document with tracking number "${trackingNumber.trim()}" already exists in the registry. Please use a unique identifier.`);
      return;
    }

    if (!title.trim()) {
      setValidationError('Document title is required.');
      return;
    }
    const effectiveOrigin = originDepartment.trim();
    if (!effectiveOrigin) {
      setValidationError(documentClassification === 'Outgoing' ? 'Destination / recipient entity is required.' : 'Originating department / agency is required.');
      return;
    }
    
    let responsiblePersonName = 'Unassigned';
    let responsiblePersonIdVal: number | undefined = undefined;
    
    if (activeFocalSupervisors.length > 0) {
      const selectedFocal = activeFocalSupervisors.find(s => s.id === responsiblePersonId);
      if (!selectedFocal) {
        setValidationError('Action officer / responsible person is required.');
        return;
      }
      responsiblePersonName = selectedFocal.name;
      responsiblePersonIdVal = parseInt(selectedFocal.id, 10);
    }


    
    if (!documentClassificationList.includes(documentClassification)) {
      setValidationError("Selected document classification is not active. Please refresh.");
      return;
    }
    if (!transactionTypeList.includes(transactionType)) {
      setValidationError("Selected transaction type is not active. Please refresh.");
      return;
    }
    if (!communicationTypeList.includes(communicationType)) {
      setValidationError("Selected communication type is not active. Please refresh.");
      return;
    }
    if (!reportTypeList.includes(reportType)) {
      setValidationError("Selected report type is not active. Please refresh.");
      return;
    }
    if (!originatingAgencyList.includes(effectiveOrigin)) {
      setValidationError("Selected originating agency is not active. Please refresh.");
      return;
    }
    if (!divisionList.includes(targetDivision)) {
      setValidationError("Selected target division is not active. Please refresh.");
      return;
    }
    if (!priorityList.includes(priority)) {
      setValidationError("Selected priority level is not active. Please refresh.");
      return;
    }
    
    setValidationError(null);
    setIsSubmitting(true);


    try {
      const nowIso = new Date().toISOString();
      const rawDoc: DocumentItem = {
        id: generateEntityId('doc'),
        trackingNumber: trackingNumber.trim(),
        title: title.trim(),
        documentClassification,
        transactionType,
        direction: documentClassification,
        documentType: transactionType,
        communicationType,
        reportType,
        originDepartment: effectiveOrigin,
        dateReceived,
        timeReceived,
        targetDivision,
        responsiblePerson: responsiblePersonName,
        responsiblePersonId: responsiblePersonIdVal,
        priority,
        currentStatus: 'Incoming Logged',
        currentLocation: documentClassification === 'Outgoing' ? 'Dispatch / Outbox Desk' : 'Receiving Station',
        currentCustodian: currentUser?.name || 'Receiving Clerk',
        fileLink: fileLink.trim() || undefined,
        movements: [
          {
            id: generateEntityId('mov'),
            timestamp: nowIso,
            personnelName: currentUser?.name || 'Receiving Clerk',
            personnelRole: currentUser?.role || 'Staff',
            currentDesk: documentClassification === 'Outgoing' ? currentUser?.division || 'Originating Desk' : 'Receiving Desk',
            forwardToDesk: targetDivision,
            statusUpdate: 'received',
            notes: notes.trim() || (documentClassification === 'Outgoing' 
              ? 'Outgoing document recorded and dispatched in official registry.' 
              : 'Incoming document received and logged in official office registry.'),
          },
        ],
        supervisorRemarks: [],
        managerClearance: {
          isCleared: false,
          clearedBy: undefined,
          clearedAt: undefined,
          clearanceType: undefined,
        },
        version: 1,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const newDoc = reconcileDocumentIntegrity(rawDoc);
      onSubmit(newDoc);
      onClose();
      // Reset form
      setTitle('');
      setOriginDepartment('');
      setResponsiblePersonId('');
      setFileLink('');
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header - Professional Slate Theme */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-slate-400">
              <PossdLogo className="w-8 h-8" variant="black" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Log Document</h2>
              <p className="text-xs text-slate-300">
                Register incoming receipt or outgoing transmittal with division routing and timestamps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto bg-white dark:bg-slate-900">
          
          {validationError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="font-semibold">{validationError}</span>
            </div>
          )}

          {/* Document Classification Mode Option */}
          <div className="p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-1 mb-1 uppercase tracking-wider">
              Document Classification
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="doc-option-incoming-btn"
                onClick={() => handleClassificationChange('Incoming')}
                className={`py-2 px-3.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  documentClassification === 'Incoming'
                    ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/60'
                }`}
              >
                <Inbox className="w-4 h-4" />
                <span>Incoming Document</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${documentClassification === 'Incoming' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>Auto-ID</span>
              </button>
              <button
                type="button"
                id="doc-option-outgoing-btn"
                onClick={() => handleClassificationChange('Outgoing')}
                className={`py-2 px-3.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  documentClassification === 'Outgoing'
                    ? 'bg-sky-600 text-white shadow-xs ring-1 ring-sky-500'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-700/60'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Outgoing Document</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${documentClassification === 'Outgoing' ? 'bg-sky-700 text-sky-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>Blank ID</span>
              </button>
            </div>
          </div>

          {/* Tracking Number & Transaction Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Tracking Number <span className="text-rose-500">*</span>
                </label>
                {documentClassification === 'Incoming' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const yyyy = new Date().getFullYear();
                      const rand = Math.floor(1000 + Math.random() * 9000);
                      setTrackingNumber(`TRK-${yyyy}-${rand}`);
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Regenerate
                  </button>
                ) : (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    Type custom code
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                id="document-tracking-number-input"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder={
                  documentClassification === 'Outgoing'
                    ? 'Enter outgoing tracking code (e.g. OUT-2026-001)...'
                    : 'e.g. TRK-2026-1234'
                }
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono uppercase"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {documentClassification === 'Outgoing'
                  ? 'Tracking number is blank for outgoing documents. Type in your official dispatch or control code.'
                  : 'Auto-generated incoming registry code. Editable if using physical transmittal numbering.'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Transaction Type
              </label>
              <select
                id="document-transaction-type-select"
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
              >
                {transactionTypeList.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Document Title / Subject <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              id="document-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title or subject"
              className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Communication Type
              </label>
              <select
                value={communicationType}
                onChange={(e) => setCommunicationType(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
              >
                {communicationTypeList.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Report / Document Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
              >
                {reportTypeList.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  Originating Dept / Agency <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    (() => {})();
                    if (!false) {
                      (() => {})();
                    }
                  }}
                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  {false ? 'Select Preset Agency' : '+ Type Custom'}
                </button>
              </div>
              
              <select
                  value={originDepartment}
                  onChange={(e) => setOriginDepartment(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
                >
                  {originatingAgencyList.map((agency: any) => (
                    <option key={agency} value={agency}>
                      {agency}
                    </option>
                  ))}
              </select>

            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Forward To / Target Division
              </label>
              <select
                value={targetDivision}
                onChange={(e) => setTargetDivision(e.target.value)}
                className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
              >
                {divisionList.map((div) => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="responsible-person-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Focal Person <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Supervisor Personnel Only
              </span>
            </div>
            <select
              id="responsible-person-input"
              value={responsiblePersonId}
              onChange={(e) => setResponsiblePersonId(e.target.value)}
              className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 cursor-pointer"
            >
              {activeFocalSupervisors.length > 0 ? (
                activeFocalSupervisors.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} — {person.role} ({person.division})
                  </option>
                ))
              ) : (
                <option value="">No supervisors available (Will be Unassigned)</option>
              )}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Selected among enrolled personnel with supervisor permissions.
            </p>
          </div>
{/* Priority & Current Desk */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Routing Priority Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Routine', 'Urgent', 'Rush'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      priority === p
                        ? p === 'Rush'
                          ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border-rose-400 dark:border-rose-800 ring-2 ring-rose-200 dark:ring-rose-900 font-bold'
                          : p === 'Urgent'
                          ? 'bg-amber-100/70 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-400 dark:border-amber-800 ring-2 ring-amber-300 dark:ring-amber-900 font-bold'
                          : 'bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800 ring-2 ring-blue-200 dark:ring-blue-900 font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            
          </div>

          {/* Attached File Link / Cloud Document URL */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Attached File / Cloud Document Link <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Cloud Storage, PDF or intranet link</span>
            </div>
            <div className="relative">
              <input
                type="url"
                id="file-link-input"
                value={fileLink}
                onChange={(e) => setFileLink(e.target.value)}
                placeholder="Paste link here (e.g., https://storage.agency.gov/file/... or https://...)"
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 pl-9 pr-24 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
              <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              {fileLink.trim() && (
                <a
                  href={fileLink.trim()}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute right-2 top-1.5 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-md flex items-center gap-1 transition-colors border border-blue-200 dark:border-blue-800"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {fileLink.trim() ? (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                Cloud document linked. Will be accessible to authorized officers across tracking stages.
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Paste an external file link to allow personnel to view digital copies directly from the registry.
              </p>
            )}
          </div>

          {/* Initial Remarks / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {documentClassification === 'Outgoing' ? 'Dispatch Notes / Transmittal Details' : 'Receiving Notes / Envelope Contents'}
            </label>
            <textarea
              id="receiving-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={documentClassification === 'Outgoing' ? 'e.g. Dispatched via courier with tracking reference, signed acknowledgment requested.' : 'e.g. Contains 3 original copies, supporting receipts, and executive brief.'}
              className="w-full text-sm rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-slate-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-incoming-doc-btn"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Recording Entry...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>{documentClassification === 'Outgoing' ? 'Log & Dispatch Document' : 'Log & Forward Document'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
