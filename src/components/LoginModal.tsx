import React, { useState } from 'react';
import { Shield, Lock, User, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles, Key, ChevronRight } from 'lucide-react';
import { AppUserRole } from '../types';
import { PossdLogo } from './PossdLogo';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  staffMembers?: AppUserRole[];
  staffList?: AppUserRole[];
  currentUser: AppUserRole | null;
  onLoginSuccess: (user: AppUserRole) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  staffMembers,
  staffList,
  currentUser,
  onLoginSuccess,
}) => {
  const roster = staffList || staffMembers || [];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<AppUserRole | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setErrorMessage('Please enter your enrolled username.');
      return;
    }

    if (!cleanPassword) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    const matchedUser = roster.find(
      (s) => s.username?.toLowerCase() === cleanUsername
    );

    if (!matchedUser) {
      setErrorMessage('No account found with this username. Please verify or consult the System Administrator.');
      return;
    }

    if (matchedUser.status === 'suspended') {
      setErrorMessage('This account is currently suspended. Please contact the System Administrator.');
      return;
    }

    // Check password (default fallback password123 or admin123 if not set)
    const expectedPassword = matchedUser.password || (matchedUser.role === 'System Admin' ? 'admin123' : 'password123');
    if (cleanPassword !== expectedPassword) {
      setErrorMessage('Invalid password. Passwords are case-sensitive.');
      return;
    }

    // Success
    setSuccessUser(matchedUser);
    setTimeout(() => {
      onLoginSuccess(matchedUser);
      setSuccessUser(null);
      if (onClose) onClose();
    }, 600);
  };

  const handleQuickSelect = (user: AppUserRole) => {
    setUsername(user.username || '');
    setPassword(user.password || (user.role === 'System Admin' ? 'admin123' : 'password123'));
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Banner */}
        <div className="bg-[#0c2340] dark:bg-[#071526] px-6 py-6 text-white text-center relative border-b border-[#1b3d64] dark:border-slate-800">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 bg-white rounded-2xl p-1.5 shadow-md flex items-center justify-center">
              <PossdLogo className="w-full h-full object-contain" />
            </div>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white">
            POSSD Document Tracking System
          </h2>
          <p className="text-xs text-blue-200/90 mt-1 font-medium">
            Institutional Portal Authentication
          </p>

          {onClose && currentUser && (
            <button
              onClick={onClose}
              type="button"
              className="absolute top-4 right-4 text-slate-300 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {successUser ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Authentication Successful
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Welcome back, <span className="font-semibold">{successUser.name}</span> ({successUser.role})
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Username field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Username</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or ana.cruz"
                  autoComplete="username"
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                />
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Password</span>
                  </label>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                    Enrolled by System Admin
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter enrolled password"
                    autoComplete="current-password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                <span>Log In to System</span>
              </button>
            </form>
          )}

          {/* Quick Enrolled Accounts Roster for Demonstration / Switching */}
          {!successUser && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Enrolled Staff Directory</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Click to auto-fill
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {roster.map((staff) => {
                  const isCurrent = currentUser?.id === staff.id;
                  const isSysAdmin = staff.role === 'System Admin';

                  return (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => handleQuickSelect(staff)}
                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                          : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isSysAdmin
                              ? 'bg-slate-800 dark:bg-amber-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {staff.avatarInitials || staff.name.charAt(0)}
                        </span>
                        <div className="truncate">
                          <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 truncate">
                            <span className="truncate">{staff.name}</span>
                            {isSysAdmin && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 shrink-0">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            User: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{staff.username}</span> • {staff.role}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/50">
                <span className="font-semibold text-slate-700 dark:text-slate-200">System Admin Notice:</span> New staff usernames &amp; passwords are enrolled and managed under the Roles &amp; Personnel Registry.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
