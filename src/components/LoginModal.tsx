import React, { useState } from 'react';
import { Shield, Sparkles, LogIn } from 'lucide-react';
import { AppUserRole } from '../types';
import { PossdLogo } from './PossdLogo';
import * as api from '../lib/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  staffList?: AppUserRole[]; // Note: retained for API signature compatibility, but bypassed in real login
  currentUser: AppUserRole | null;
  onLoginSuccess: (user: AppUserRole) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await api.loginWithCredentials(cleanEmail, cleanPassword);
      if (result && result.user) {
        onLoginSuccess(result.user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[400px] overflow-hidden flex flex-col relative max-h-[90vh]">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-500 z-10" />

        <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4 overflow-y-auto">
          <PossdLogo className="w-16 h-16 text-blue-600 dark:text-blue-500 mb-1" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Authenticate</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Official POSSD Provincial Document Tracking Portal
            </p>
          </div>

          {errorMessage && (
            <div className="w-full p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs sm:text-sm font-medium border border-rose-200 dark:border-rose-800 flex items-start gap-2 text-left">
              <Shield className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-tight">{errorMessage}</div>
            </div>
          )}

          {currentUser ? (
            <div className="w-full mt-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">Authenticated Session:</div>
              <div className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">{currentUser.name}</div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 inline-block self-center border border-blue-100 dark:border-blue-800">
                {currentUser.role} &bull; {currentUser.division}
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 px-4 py-2 w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleLogin} className="w-full space-y-4 pt-1">
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Official Email or Username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-slate-900 dark:text-white"
                    disabled={isLoading}
                    required
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-slate-900 dark:text-white"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setEmail('dev_admin');
                  setPassword('dev_admin');
                  setIsLoading(true);
                  setErrorMessage(null);
                  try {
                    const result = await api.loginWithCredentials('dev_admin', 'dev_admin');
                    if (result && result.user) {
                      onLoginSuccess(result.user);
                    }
                  } catch (err: any) {
                    setErrorMessage(err.message || 'Invalid email or password.');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className="w-full p-3 rounded-xl bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-left space-y-1 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Quick Fill &amp; Login (System Admin)</span>
                  </div>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium group-hover:underline">Click to Auto-Login &rarr;</span>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 font-mono flex items-center justify-between">
                  <span>User: <strong>dev_admin</strong></span>
                  <span>Pass: <strong>dev_admin</strong></span>
                </div>
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative group overflow-hidden bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3.5 rounded-2xl font-semibold text-sm sm:text-[15px] flex items-center justify-center gap-2.5 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-2xl" />
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Sign In</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500 justify-center pt-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Secure Role Based Access Control</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

