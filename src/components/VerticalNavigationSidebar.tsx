import React from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Users,
  BarChart3,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Sliders,
  UserCog,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Inbox,
  Sparkles,
  RefreshCw,
  Keyboard,
  ExternalLink,
  FolderGit2,
} from 'lucide-react';

export type WorkspaceTab = 'documents' | 'distribution' | 'analytics' | 'links' | 'admin';

interface VerticalNavigationSidebarProps {
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  documentsCount: number;
  focalPendingCount: number;
  overdueCount: number;
  activeCount: number;
  clearedCount: number;
  isRefreshing?: boolean;
  onManualRefresh?: () => void;
  onOpenRolesModal: () => void;
  onOpenThresholdModal: () => void;
  onOpenShortcutsModal?: () => void;
  currentUserRole: string;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const VerticalNavigationSidebar: React.FC<VerticalNavigationSidebarProps> = ({
  activeTab,
  setActiveTab,
  documentsCount,
  focalPendingCount,
  overdueCount,
  activeCount,
  clearedCount,
  isRefreshing = false,
  onManualRefresh,
  onOpenRolesModal,
  onOpenThresholdModal,
  onOpenShortcutsModal,
  currentUserRole,
  isCollapsed,
  setIsCollapsed,
}) => {
  const isSysAdmin = currentUserRole === 'System Admin';

  const navItems = [
    {
      id: 'documents' as WorkspaceTab,
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      description: 'Central document registry & incoming tracker',
      icon: FileText,
      badge: documentsCount,
      badgeType: 'count' as const,
      color: 'amber',
    },
    {
      id: 'distribution' as WorkspaceTab,
      label: 'Distribution Desk',
      shortLabel: 'Distribution',
      description: 'Focal persons assignment queue',
      icon: Users,
      badge: focalPendingCount > 0 ? focalPendingCount : undefined,
      badgeLabel: focalPendingCount > 0 ? `${focalPendingCount} pending` : 'Focal Queue',
      badgeType: 'pill' as const,
      color: 'emerald',
    },
    {
      id: 'analytics' as WorkspaceTab,
      label: 'Analytics & Insights',
      shortLabel: 'Analytics',
      description: 'SLA compliance & dwell trends',
      icon: BarChart3,
      badgeLabel: 'recharts',
      badgeType: 'pill' as const,
      color: 'sky',
    },
    {
      id: 'links' as WorkspaceTab,
      label: 'Dedicated Links & Drives',
      shortLabel: 'Drives & Links',
      description: 'Institutional drives, files & reference URLs',
      icon: ExternalLink,
      badgeLabel: 'Shared',
      badgeType: 'pill' as const,
      color: 'indigo',
    },
    ...(isSysAdmin
      ? [
          {
            id: 'admin' as WorkspaceTab,
            label: 'System Admin Settings',
            shortLabel: 'Admin Settings',
            description: 'Time-in-desk SLA thresholds & system controls',
            icon: Sliders,
            badgeLabel: 'Admin',
            badgeType: 'pill' as const,
            color: 'slate',
          },
        ]
      : []),
  ];

  return (
    <aside
      className={`relative shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-all duration-300 select-none z-20 ${
        isCollapsed ? 'w-20' : 'w-64 xl:w-72'
      }`}
    >
      {/* Top Header / Collapse Toggle */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">
              Workspace Navigation
            </span>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Links with Vertical Sliding Highlight */}
      <div className="p-3 flex-1 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div key={item.id} className="relative">
              {/* Sliding Active Pill Background using motion layoutId */}
              {isActive && (
                <motion.div
                  layoutId="activeVerticalTabIndicator"
                  className="absolute inset-0 bg-slate-800 border border-slate-700 rounded-xl shadow-inner pointer-events-none"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              <button
                type="button"
                id={`vtab-${item.id}-btn`}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? `${item.label} (${item.description})` : undefined}
                className={`relative w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors cursor-pointer group z-10 ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {/* Active Indicator Bar on Left */}
                {isActive && (
                  <motion.div
                    layoutId="activeVerticalTabBorder"
                    className="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-slate-300"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}

                {/* Icon */}
                <div
                  className={`shrink-0 p-2 rounded-lg transition-transform group-hover:scale-105 ${
                    isActive
                      ? 'bg-slate-700 text-slate-100 ring-1 ring-slate-600'
                      : 'bg-slate-800 text-slate-400 group-hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Label & Description (visible when expanded) */}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate group-hover:translate-x-0.5 transition-transform">
                        {item.label}
                      </span>

                      {/* Badge */}
                      {item.badgeType === 'count' && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            isActive
                              ? 'bg-slate-200 text-slate-900 shadow-2xs'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {item.badgeType === 'pill' && item.badgeLabel && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-semibold shrink-0 ${
                            isActive
                              ? 'bg-slate-200 text-slate-900 font-bold'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {item.badgeLabel}
                        </span>
                      )}
                    </div>

                    <p className="text-[10.5px] text-slate-400 truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom Shortcuts / Persistence Store Status */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/70 space-y-2">
        {/* System Persistence Status */}
        <div className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left bg-slate-900/60 text-slate-300 border border-slate-800">
          <div className="relative shrink-0">
            <FolderGit2 className="w-4 h-4 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold truncate text-slate-200">
                  Document Store
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-emerald-300 border border-slate-700">
                    {isRefreshing ? 'Refreshing...' : 'Active'}
                  </span>
                  {onManualRefresh && (
                    <button
                      type="button"
                      onClick={onManualRefresh}
                      disabled={isRefreshing}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
                      title="Refresh document records"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-slate-300' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                Local-First Persistence
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons (SLA, Roles, Shortcuts) */}
        {!isCollapsed ? (
          <div className="space-y-1.5 pt-1">
            <button
              type="button"
              onClick={onOpenShortcutsModal}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                <span>Shortcuts Guide</span>
              </div>
              <kbd className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-slate-900 text-slate-400 border border-slate-700">
                ?
              </kbd>
            </button>

            {isSysAdmin && (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={onOpenThresholdModal}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10.5px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                  title="Configure Time-in-Desk Thresholds (System Admin Only)"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span>Thresholds</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenRolesModal}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10.5px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                  title="Manage Staff Roles & Permissions (System Admin)"
                >
                  <UserCog className="w-3.5 h-3.5 text-slate-400" />
                  <span>Roles</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onOpenShortcutsModal}
              title="Keyboard Shortcuts (?)"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex justify-center transition-colors cursor-pointer"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            {isSysAdmin && (
              <>
                <button
                  type="button"
                  onClick={onOpenThresholdModal}
                  title="Time in Desk SLA Thresholds (System Admin)"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex justify-center transition-colors cursor-pointer"
                >
                  <Sliders className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenRolesModal}
                  title="Manage Roles & Personnel (System Admin)"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex justify-center transition-colors cursor-pointer"
                >
                  <UserCog className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
