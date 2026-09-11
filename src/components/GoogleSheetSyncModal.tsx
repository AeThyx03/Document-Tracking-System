import React, { useState } from 'react';
import {
  SheetMetadata,
  createTrackingSheet,
  syncAllDocumentsToSheet,
  pullAllFromSheet,
  getRemoteDocumentCount,
  isGoogleQuotaError,
  verifySheetConnection,
  SheetConnectionVerification,
  getAppsScriptTemplateCode,
} from '../lib/googleSheets';
import { DocumentItem, AppUserRole } from '../types';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  ShieldAlert,
  Users,
  DownloadCloud,
  Share2,
  Copy,
  Check,
  Activity,
  Database,
  Code,
  Unlink,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { googleSignIn, logoutGoogle, getStaySignedIn, setStaySignedIn } from '../lib/firebase';
import { User } from 'firebase/auth';
import { getStoredStaffMembers } from '../mockData';

interface GoogleSheetSyncProps {
  user: User | null;
  token: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onSignOut: () => void;
  sheetConfig: SheetMetadata | null;
  onSaveSheetConfig: (config: SheetMetadata | null) => void;
  documents: DocumentItem[];
  staffList?: AppUserRole[];
  onNotify: (title: string, message: string, type: 'sync') => void;
  onPullSuccess?: (updatedDocs: DocumentItem[], updatedStaff: AppUserRole[]) => void;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncProps & { isOpen: boolean; onClose: () => void }> = ({
  user,
  token,
  onAuthSuccess,
  onSignOut,
  sheetConfig,
  onSaveSheetConfig,
  documents,
  staffList,
  onNotify,
  onPullSuccess,
  isOpen,
  onClose,
}) => {
  const effectiveStaffList = staffList || getStoredStaffMembers();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [customSheetId, setCustomSheetId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<SheetConnectionVerification | null>(null);
  const [confirmPrompt, setConfirmPrompt] = useState<{ open: boolean; action: () => Promise<void>; description: string } | null>(null);
  const [staySignedIn, setStaySignedInState] = useState<boolean>(() => getStaySignedIn());

  if (!isOpen) return null;

  const handleToggleStaySignedIn = (checked: boolean) => {
    setStaySignedInState(checked);
    setStaySignedIn(checked);
  };

  const formatSyncError = (err: any, defaultMsg: string): string => {
    if (isGoogleQuotaError(err)) {
      return 'Google Sheets write quota limit reached (60 requests/minute per user). Please wait 60 seconds for the quota window to reset. All local data is safe and intact.';
    }
    return err?.message || defaultMsg;
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn({ staySignedIn });
      if (res) {
        onAuthSuccess(res.user, res.accessToken);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication was cancelled or failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!token) {
      setErrorMessage('Please sign in with Google first.');
      return;
    }

    setConfirmPrompt({
      open: true,
      description: `Create a new Google Sheet named "POSSD Document Tracking & Personnel Registry" in your Google Drive, with "Master Tracking" and "Personnel Directory" tabs pre-formatted and synced with ${documents.length} document entries and ${effectiveStaffList.length} personnel profiles?`,
      action: async () => {
        setIsCreatingSheet(true);
        setErrorMessage(null);
        try {
          const newSheet = await createTrackingSheet(token);
          onSaveSheetConfig(newSheet);
          // Sync current documents and personnel immediately
          const res = await syncAllDocumentsToSheet(token, newSheet.spreadsheetId, documents, effectiveStaffList);
          setSyncStatus(`Created spreadsheet and synced ${res.rowsUpdated} document entries and ${res.personnelUpdated} personnel profiles successfully!`);
          onNotify(
            'Google Sheet Connected',
            `Created and linked registry with ${res.rowsUpdated} documents and ${res.personnelUpdated} personnel profiles.`,
            'sync'
          );
        } catch (err: any) {
          setErrorMessage(formatSyncError(err, 'Failed to create Google Sheet. Please check permissions.'));
        } finally {
          setIsCreatingSheet(false);
        }
      },
    });
  };

  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState<string>(sheetConfig?.appsScriptUrl || '');
  const [copiedScript, setCopiedScript] = useState(false);
  const [showAppsScriptPanel, setShowAppsScriptPanel] = useState(false);

  const handleCopyScriptCode = () => {
    const code = getAppsScriptTemplateCode();
    navigator.clipboard.writeText(code);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleSaveAppsScriptUrl = () => {
    if (!sheetConfig) {
      setErrorMessage('Please link a Google Sheet first.');
      return;
    }
    const cleanUrl = appsScriptUrlInput.trim();
    const updated: SheetMetadata = {
      ...sheetConfig,
      appsScriptUrl: cleanUrl || undefined,
    };
    onSaveSheetConfig(updated);
    setSyncStatus(
      cleanUrl
        ? 'Apps Script Webhook saved! All devices (phones, laptops, PCs) can now push and sync without signing in.'
        : 'Apps Script Webhook cleared.'
    );
    onNotify(
      'Webhook Updated',
      cleanUrl ? 'Zero-login write webhook enabled for all devices.' : 'Webhook removed.',
      'sync'
    );
  };

  const handleDisconnectSheet = () => {
    setConfirmPrompt({
      open: true,
      description:
        'Disconnect the currently linked Google Sheet? All local document tracking records and personnel profiles will remain safely stored on this device.',
      action: async () => {
        onSaveSheetConfig(null);
        setCustomSheetId('');
        setDiagnosticResult(null);
        setValidationResult(null);
        setSyncStatus('Google Sheet disconnected.');
        onNotify('Google Sheet Disconnected', 'Spreadsheet was disconnected from local workspace.', 'sync');
      },
    });
  };

  const handleLinkExistingSheet = async () => {
    const cleanId = customSheetId.trim();
    if (!cleanId) {
      setErrorMessage('Please paste a valid Google Sheet ID or URL.');
      return;
    }

    // Extract ID if URL pasted
    let extractedId = cleanId;
    const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      extractedId = match[1];
    }

    const config: SheetMetadata = {
      spreadsheetId: extractedId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${extractedId}/edit`,
      sheetName: 'Master Tracking',
      appsScriptUrl: appsScriptUrlInput.trim() || undefined,
    };

    if (!token && !appsScriptUrlInput.trim()) {
      setIsSyncing(true);
      setErrorMessage(null);
      try {
        onSaveSheetConfig(config);
        const res = await pullAllFromSheet(null, extractedId, documents, effectiveStaffList);
        if (onPullSuccess && (res.documents.length > 0 || res.personnel.length > 0)) {
          onPullSuccess(res.documents, res.personnel);
        }
        setSyncStatus(`Connected to spreadsheet (${extractedId}) in Zero-Login Public Mode! Pull and search are active.`);
        onNotify(
          'Google Sheet Linked',
          `Spreadsheet (${extractedId}) linked in zero-login mode.`,
          'sync'
        );
      } catch (err: any) {
        onSaveSheetConfig(config);
        setSyncStatus(`Connected to spreadsheet (${extractedId}).`);
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    setConfirmPrompt({
      open: true,
      description: `Connect Google Sheet ID "${extractedId}" and synchronize all ${documents.length} document tracking records plus ${effectiveStaffList.length} personnel roster entries into it?`,
      action: async () => {
        setIsSyncing(true);
        setErrorMessage(null);
        try {
          const res = await syncAllDocumentsToSheet(token, extractedId, documents, effectiveStaffList, {
            appsScriptUrl: appsScriptUrlInput.trim() || undefined,
          });
          onSaveSheetConfig(config);
          setSyncStatus(`Successfully connected & updated ${res.rowsUpdated} document entries and ${res.personnelUpdated} personnel records in Google Sheet.`);
          onNotify(
            'Google Sheet Synchronized',
            `Synchronized ${res.rowsUpdated} documents and ${res.personnelUpdated} personnel into spreadsheet (${extractedId}).`,
            'sync'
          );
        } catch (err: any) {
          setErrorMessage(formatSyncError(err, 'Failed to connect sheet. Verify permissions or Apps Script setup.'));
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const handlePerformSync = async () => {
    if (!sheetConfig) {
      setErrorMessage('No Google Sheet linked. Please create or connect a spreadsheet first.');
      return;
    }

    setConfirmPrompt({
      open: true,
      description: `Synchronize ${documents.length} document records and ${effectiveStaffList.length} personnel roster entries to your linked Google Sheet? This will update both "Master Tracking" and "Personnel Directory" tabs.`,
      action: async () => {
        setIsSyncing(true);
        setErrorMessage(null);
        try {
          const res = await syncAllDocumentsToSheet(token, sheetConfig.spreadsheetId, documents, effectiveStaffList, {
            appsScriptUrl: sheetConfig.appsScriptUrl,
          });
          setSyncStatus(`Sync completed: ${res.rowsUpdated} document entries and ${res.personnelUpdated} personnel records refreshed into "${res.masterTabName}" at ${new Date().toLocaleTimeString()}.`);
          
          if (res.masterSheetId !== undefined && !sheetConfig.spreadsheetUrl.includes('#gid=')) {
            onSaveSheetConfig({
              ...sheetConfig,
              spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit#gid=${res.masterSheetId}`,
              sheetName: res.masterTabName,
            });
          }

          onNotify(
            'Google Sheet Updated',
            `All ${res.rowsUpdated} documents and ${res.personnelUpdated} personnel profiles synced to tab "${res.masterTabName}".`,
            'sync'
          );
        } catch (err: any) {
          setErrorMessage(formatSyncError(err, 'Sync failed. Check connection or Apps Script Webhook.'));
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const handlePullFromSheet = async () => {
    if (!sheetConfig) return;

    setConfirmPrompt({
      open: true,
      description: `Pull all documents and personnel roster from Google Sheet into this device? Any records on the sheet will be merged into this device's storage.`,
      action: async () => {
        setIsPulling(true);
        setErrorMessage(null);
        try {
          const res = await pullAllFromSheet(token, sheetConfig.spreadsheetId, documents, effectiveStaffList);
          if (onPullSuccess) {
            onPullSuccess(res.documents, res.personnel);
          }
          setSyncStatus(`Device updated! Pulled ${res.personnel.length} personnel profiles and ${res.documents.length} tracking records from Google Sheet.`);
          onNotify(
            'Device Synchronized',
            `Imported ${res.personnel.length} personnel and ${res.documents.length} document records from Google Sheet to this device.`,
            'sync'
          );
        } catch (err: any) {
          setErrorMessage(formatSyncError(err, 'Failed to pull data from Google Sheet.'));
        } finally {
          setIsPulling(false);
        }
      },
    });
  };

  const handleValidateIntegrity = async () => {
    if (!sheetConfig) return;
    setIsValidating(true);
    setValidationResult(null);
    try {
      const remoteCount = await getRemoteDocumentCount(token, sheetConfig.spreadsheetId);
      const localCount = documents.length;
      if (remoteCount === localCount) {
        setValidationResult({
          type: 'success',
          text: `Integrity Verified: Both local state and Google Sheet contain exactly ${localCount} document record(s).`
        });
      } else {
        setValidationResult({
          type: 'error',
          text: `Discrepancy Found! Local state has ${localCount} document(s), but Google Sheet contains ${remoteCount} record(s). Click "Force Push All Entries" to align.`
        });
      }
    } catch (err: any) {
      setValidationResult({
        type: 'error',
        text: err.message || 'Failed to validate sheet integrity.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleCheckConnection = async () => {
    if (!sheetConfig) return;
    setIsTestingConnection(true);
    setDiagnosticResult(null);
    setErrorMessage(null);
    try {
      const res = await verifySheetConnection(token, sheetConfig.spreadsheetId);
      setDiagnosticResult(res);
      if (res.connected) {
        setSyncStatus(`Connection verified: "${res.spreadsheetTitle}" is reachable with ${res.rowCount} row(s) in Master Tracking.`);
      } else {
        setErrorMessage(`Connection issue: ${res.message}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection test failed.');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleForcePushAll = async () => {
    if (!sheetConfig) {
      setErrorMessage('No Google Sheet linked. Please create or connect a spreadsheet first.');
      return;
    }

    setConfirmPrompt({
      open: true,
      description: `Force Push all ${documents.length} document entries and ${effectiveStaffList.length} personnel profiles to the linked Google Sheet? This will refresh both headers and re-write every row to guarantee complete synchronization.`,
      action: async () => {
        setIsSyncing(true);
        setErrorMessage(null);
        try {
          const res = await syncAllDocumentsToSheet(token, sheetConfig.spreadsheetId, documents, effectiveStaffList, {
            forceHeaders: true,
            appsScriptUrl: sheetConfig.appsScriptUrl,
          });
          setSyncStatus(`Force push successful! Updated ${res.rowsUpdated} document rows in "${res.masterTabName}" and ${res.personnelUpdated} personnel profiles in Google Sheet.`);
          
          if (res.masterSheetId !== undefined && !sheetConfig.spreadsheetUrl.includes('#gid=')) {
            onSaveSheetConfig({
              ...sheetConfig,
              spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit#gid=${res.masterSheetId}`,
              sheetName: res.masterTabName,
            });
          }

          onNotify(
            'Google Sheet Force Sync Complete',
            `All ${res.rowsUpdated} documents and ${res.personnelUpdated} staff records written to tab "${res.masterTabName}".`,
            'sync'
          );
        } catch (err: any) {
          setErrorMessage(formatSyncError(err, 'Failed to force push entries.'));
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const crossDeviceUrl = sheetConfig
    ? `${window.location.protocol}//${window.location.host}${window.location.pathname}?sheet=${sheetConfig.spreadsheetId}`
    : '';

  const handleCopyDeviceLink = () => {
    if (!crossDeviceUrl) return;
    navigator.clipboard.writeText(crossDeviceUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Google Sheet Master Integration</h2>
              <p className="text-xs text-slate-300">
                Single unified Google Sheet • Zero-login public editor mode • No sign-in required
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 text-sm font-medium cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Current Sheet Connection Status */}
          {sheetConfig ? (
            <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Linked Single Master Google Sheet</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-mono break-all">{sheetConfig.spreadsheetId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={sheetConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline shrink-0"
                  >
                    Open Sheet <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={handleDisconnectSheet}
                    title="Disconnect this spreadsheet"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline cursor-pointer shrink-0"
                  >
                    <Unlink className="w-3.5 h-3.5" /> Disconnect
                  </button>
                </div>
              </div>

              {/* Zero-Login Status Banner */}
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-medium">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>
                    <strong>Zero-Login Ready:</strong> Configured for "Anyone with the link as Editor". All entries are stored centrally and synchronized without requiring Google login.
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-700 text-white font-semibold uppercase shrink-0">Active</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                <span>Total records in queue: <strong>{documents.length}</strong> | Enrolled personnel: <strong>{effectiveStaffList.length}</strong></span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="check-connection-btn"
                    onClick={handleCheckConnection}
                    disabled={isTestingConnection}
                    title="Test reachability, tab existence, and read/write access to this Google Sheet"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-semibold transition-colors disabled:opacity-50 cursor-pointer text-xs"
                  >
                    <Activity className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                    {isTestingConnection ? 'Testing...' : 'Check Connection'}
                  </button>
                  <button
                    id="pull-sheet-btn"
                    onClick={handlePullFromSheet}
                    disabled={isPulling || isSyncing}
                    title="Import all records and personnel from Google Sheet to this device"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-semibold transition-colors disabled:opacity-50 cursor-pointer text-xs"
                  >
                    <DownloadCloud className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                    {isPulling ? 'Importing...' : 'Pull from Sheet'}
                  </button>
                  <button
                    id="sync-now-sheet-btn"
                    onClick={handlePerformSync}
                    disabled={isSyncing || isPulling}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer text-xs shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Synchronizing...' : 'Sync Registry to Sheet'}
                  </button>
                  <button
                    id="force-push-sheet-btn"
                    onClick={handleForcePushAll}
                    disabled={isSyncing || isPulling}
                    title="Force refresh sheet headers and re-write every record"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer text-xs"
                  >
                    <Database className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Pushing All...' : 'Force Push All'}
                  </button>
                </div>
              </div>

              {/* Diagnostic Result Box */}
              {diagnosticResult && (
                <div className={`mt-2 p-3 rounded-xl border text-xs space-y-1.5 ${
                  diagnosticResult.connected
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-4 h-4" />
                      Connection Diagnostic Report
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                      diagnosticResult.connected ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {diagnosticResult.connected ? 'Connected' : 'Error'}
                    </span>
                  </div>
                  <p>{diagnosticResult.message}</p>
                  {diagnosticResult.connected && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      <div>Sheet Title: <strong>{diagnosticResult.spreadsheetTitle}</strong></div>
                      <div>Master Tab: <strong className={diagnosticResult.hasMasterTab ? 'text-emerald-600' : 'text-rose-600'}>{diagnosticResult.hasMasterTab ? 'Found' : 'Missing'}</strong></div>
                      <div>Rows Detected: <strong>{diagnosticResult.rowCount}</strong></div>
                    </div>
                  )}
                </div>
              )}

              {/* Validation Row */}
              <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Compare row counts to detect missing records</span>
                  <button
                    onClick={handleValidateIntegrity}
                    disabled={isValidating || !token}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <ShieldAlert className={`w-3.5 h-3.5 ${isValidating ? 'animate-pulse' : ''}`} />
                    {isValidating ? 'Validating...' : 'Validate Sheet Integrity'}
                  </button>
                </div>
                {validationResult && (
                  <div className={`px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 ${
                    validationResult.type === 'success' 
                      ? 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800' 
                      : 'bg-rose-50 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                  }`}>
                    {validationResult.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{validationResult.text}</span>
                  </div>
                )}
              </div>

              {/* Multi-Device Link Box */}
              <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-medium">Multi-Device Link: Open on any smartphone, laptop or PC to link this sheet automatically</span>
                </div>
                <button
                  onClick={handleCopyDeviceLink}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-200 rounded-md font-medium text-[11px] transition-colors cursor-pointer shrink-0"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-emerald-600" />}
                  {copiedLink ? 'Link Copied!' : 'Copy Device Link'}
                </button>
              </div>

              {/* Zero-Login Apps Script Webhook Section */}
              <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowAppsScriptPanel(!showAppsScriptPanel)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Zero-Login Push Setup (Google Apps Script Webhook)</span>
                    {showAppsScriptPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {sheetConfig.appsScriptUrl && (
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Webhook configured
                    </span>
                  )}
                </div>

                {showAppsScriptPanel && (
                  <div className="p-3 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-indigo-200 dark:border-indigo-900/60 space-y-3 text-xs">
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Deploy our Google Apps Script inside this spreadsheet. Once deployed, <strong>any device</strong> (mobile phones, tablets, office laptops) can push document tracking records and personnel updates directly without requiring users to log into a Google account.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        value={appsScriptUrlInput}
                        onChange={(e) => setAppsScriptUrlInput(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-white font-mono placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveAppsScriptUrl}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors shrink-0 cursor-pointer text-xs"
                      >
                        Save Webhook
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyScriptCode}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer text-xs"
                      >
                        {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Code className="w-3.5 h-3.5" />}
                        {copiedScript ? 'Script Copied!' : 'Copy Script Code'}
                      </button>
                    </div>

                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg">
                      <li>In your Google Sheet, open <strong>Extensions &gt; Apps Script</strong>.</li>
                      <li>Click <strong>Copy Script Code</strong> above, paste it into the editor, and save.</li>
                      <li>Click <strong>Deploy &gt; New deployment</strong>, select type <strong>Web app</strong>, set <em>Execute as: Me</em> and <em>Who has access: Anyone</em>.</li>
                      <li>Authorize the script and paste the generated <code>/exec</code> URL above.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-800 dark:text-slate-200 space-y-1">
                  <p className="font-semibold">Link Master Google Sheet (Zero-Login Public Mode)</p>
                  <p className="text-slate-600 dark:text-slate-400">
                    Paste the link to your Google Sheet below. Because the sheet is configured with <em>"Anyone with the link as Editor"</em>, all staff entries, comments, and clearance actions will be permanently synchronized without requiring any Google sign-in.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="existing-sheet-input"
                    value={customSheetId}
                    onChange={(e) => setCustomSheetId(e.target.value)}
                    placeholder="Paste Google Sheet URL or ID (e.g., https://docs.google.com/spreadsheets/d/...)"
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 font-mono"
                  />
                  <button
                    id="link-sheet-btn"
                    onClick={handleLinkExistingSheet}
                    disabled={isSyncing || !customSheetId.trim()}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    Link Master Sheet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feedback banners */}
          {syncStatus && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{syncStatus}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-medium text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Data fields note */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Incorporated Data Columns:</span>
            <p className="mt-1 leading-relaxed">
              Tracking Number, Document Title, Document Type, Originating Department, Date Received, Time Received (auto-recorded), Target Division, Responsible Person, Current Status, Current Desk/Room, Current Custodian, Full Internal Movements History, Supervisor Remarks &amp; Compliance, and Manager Clearance &amp; Outgoing Dispatch Details.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">Single consolidated Google Sheet integration</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive/Mutating Workspace operations */}
      {confirmPrompt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Confirm Google Sheet Operation</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {confirmPrompt.description}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmPrompt(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const action = confirmPrompt.action;
                  setConfirmPrompt(null);
                  await action();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Proceed & Update Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
