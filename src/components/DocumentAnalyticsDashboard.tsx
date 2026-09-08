import React, { useState, useMemo } from 'react';
import { DocumentItem, AppUserRole } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Info,
  ChevronRight,
  PieChart as PieIcon,
  Timer,
} from 'lucide-react';

interface DocumentAnalyticsDashboardProps {
  documents: DocumentItem[];
  staffList?: AppUserRole[];
  onSelectDocument?: (doc: DocumentItem) => void;
}

// Chart color palettes - refined, accessible, domain-appropriate tones (Navy, Blue, Green, Yellow/Amber, White)
const PRIORITY_COLORS: Record<string, string> = {
  Routine: '#1d4ed8', // Institutional Royal Blue
  Urgent: '#d97706', // Warm Amber / Yellow
  Rush: '#dc2626', // Alert Red
};

const DEPARTMENT_COLORS = [
  '#0c2340', // Deep Navy
  '#15803d', // Forest Green
  '#1d4ed8', // Royal Blue
  '#b45309', // Warm Amber Gold
  '#0f766e', // Teal Green
  '#16a34a', // Emerald Green
  '#2563eb', // Vivid Blue
  '#ca8a04', // Rich Yellow
];

const STATUS_COLORS: Record<string, string> = {
  'Incoming Logged': '#64748b',
  'Under Review': '#1d4ed8',
  'Supervisor Comment Needed': '#d97706',
  'Complied / Ready for Clearance': '#0284c7',
  'Cleared for Out': '#16a34a',
  'Dispatched / Completed': '#15803d',
};

export const DocumentAnalyticsDashboard: React.FC<DocumentAnalyticsDashboardProps> = ({
  documents,
  staffList,
  onSelectDocument,
}) => {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('ALL');
  const [metricUnit, setMetricUnit] = useState<'hours' | 'days'>('hours');

  // Filtered dataset for responsive insights
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchDept =
        selectedDeptFilter === 'ALL' ||
        doc.targetDivision === selectedDeptFilter ||
        doc.originDepartment === selectedDeptFilter;
      const matchPriority =
        selectedPriorityFilter === 'ALL' || doc.priority === selectedPriorityFilter;
      return matchDept && matchPriority;
    });
  }, [documents, selectedDeptFilter, selectedPriorityFilter]);

  // Distinct departments across all documents
  const allDepartments = useMemo(() => {
    const depts = new Set<string>();
    documents.forEach((d) => {
      if (d.targetDivision) depts.add(d.targetDivision);
    });
    return Array.from(depts).sort();
  }, [documents]);

  // 1. DATA: Document Volume by Department / Division
  const departmentVolumeData = useMemo(() => {
    const deptMap: Record<
      string,
      {
        department: string;
        total: number;
        inProgress: number;
        cleared: number;
        underReview: number;
        supervisorReview: number;
      }
    > = {};

    filteredDocs.forEach((doc) => {
      const dept = doc.targetDivision || 'Unassigned';
      if (!deptMap[dept]) {
        deptMap[dept] = {
          department: dept,
          total: 0,
          inProgress: 0,
          cleared: 0,
          underReview: 0,
          supervisorReview: 0,
        };
      }
      deptMap[dept].total += 1;
      if (doc.currentStatus === 'Cleared for Out' || doc.currentStatus === 'Dispatched / Completed') {
        deptMap[dept].cleared += 1;
      } else if (doc.currentStatus === 'Supervisor Comment Needed') {
        deptMap[dept].supervisorReview += 1;
      } else if (doc.currentStatus === 'Under Review') {
        deptMap[dept].underReview += 1;
      } else {
        deptMap[dept].inProgress += 1;
      }
    });

    return Object.values(deptMap).sort((a, b) => b.total - a.total);
  }, [filteredDocs]);

  // 2. DATA: Average Processing Time per Priority Level
  // Calculates real elapsed duration from creation/receipt to clearance or current time
  const priorityProcessingData = useMemo(() => {
    const priorities = ['Rush', 'Urgent', 'Routine'] as const;
    const now = Date.now();

    return priorities.map((prio) => {
      const prioDocs = filteredDocs.filter((d) => d.priority === prio);
      if (prioDocs.length === 0) {
        return {
          priority: prio,
          count: 0,
          avgHours: 0,
          avgDays: 0,
          clearedCount: 0,
          targetSlaHours: prio === 'Rush' ? 4 : prio === 'Urgent' ? 8 : 24,
          onTimeRate: 100,
        };
      }

      let totalElapsedHours = 0;
      let onTimeCount = 0;
      let clearedCount = 0;
      const targetSlaHours = prio === 'Rush' ? 4 : prio === 'Urgent' ? 8 : 24;

      prioDocs.forEach((doc) => {
        const startMillis = new Date(doc.createdAt || `${doc.dateReceived}T${doc.timeReceived}Z`).getTime();
        let endMillis = now;

        if (doc.managerClearance?.isCleared && doc.managerClearance.clearedAt) {
          endMillis = new Date(doc.managerClearance.clearedAt).getTime();
          clearedCount += 1;
        } else if (doc.movements && doc.movements.length > 0) {
          // Use latest movement for elapsed measurement if active
          const lastMov = doc.movements[doc.movements.length - 1];
          if (doc.currentStatus === 'Cleared for Out' || doc.currentStatus === 'Dispatched / Completed') {
            endMillis = new Date(lastMov.timestamp).getTime();
            clearedCount += 1;
          }
        }

        const elapsedHours = Math.max(0.2, (endMillis - startMillis) / (1000 * 60 * 60));
        totalElapsedHours += elapsedHours;

        if (elapsedHours <= targetSlaHours) {
          onTimeCount += 1;
        }
      });

      const avgHours = parseFloat((totalElapsedHours / prioDocs.length).toFixed(1));
      const avgDays = parseFloat((avgHours / 24).toFixed(1));
      const onTimeRate = Math.round((onTimeCount / prioDocs.length) * 100);

      return {
        priority: prio,
        count: prioDocs.length,
        avgHours,
        avgDays,
        clearedCount,
        targetSlaHours,
        onTimeRate,
      };
    });
  }, [filteredDocs]);

  // 3. DATA: Document Type Distribution
  const documentTypeData = useMemo(() => {
    const typeCount: Record<string, number> = {};
    filteredDocs.forEach((d) => {
      const type = d.documentType || 'General Official';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    return Object.entries(typeCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredDocs]);

  // Executive KPI summary numbers
  const totalVolume = filteredDocs.length;
  const clearedTotal = filteredDocs.filter(
    (d) => d.currentStatus === 'Cleared for Out' || d.currentStatus === 'Dispatched / Completed'
  ).length;
  const clearanceRate = totalVolume > 0 ? Math.round((clearedTotal / totalVolume) * 100) : 0;

  const overallAvgHours = useMemo(() => {
    if (totalVolume === 0) return '0.0';
    const totalHours = priorityProcessingData.reduce((acc, curr) => acc + curr.avgHours * curr.count, 0);
    return (totalHours / totalVolume).toFixed(1);
  }, [priorityProcessingData, totalVolume]);

  const topDepartment = departmentVolumeData[0]?.department || 'None';
  const topDeptCount = departmentVolumeData[0]?.total || 0;

  const pendingClearance = filteredDocs.filter(
    (d) => d.currentStatus !== 'Cleared for Out' && d.currentStatus !== 'Dispatched / Completed'
  ).length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 dark:bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Document Management Analytics</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                  Leadership SLA Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time volume tracking by department and priority processing turnaround benchmarks.
              </p>
            </div>
          </div>

          {/* Interactive Filters Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <label htmlFor="dept-analytics-filter" className="font-medium text-slate-500 dark:text-slate-400">Division:</label>
              <select
                id="dept-analytics-filter"
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                aria-label="Filter by department"
                className="bg-transparent dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="ALL">All Departments ({documents.length})</option>
                {allDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300">
              <label htmlFor="priority-analytics-filter" className="font-medium text-slate-500 dark:text-slate-400">Priority:</label>
              <select
                id="priority-analytics-filter"
                value={selectedPriorityFilter}
                onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                aria-label="Filter by priority level"
                className="bg-transparent dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Priorities</option>
                <option value="Rush">Rush Only</option>
                <option value="Urgent">Urgent Only</option>
                <option value="Routine">Routine Only</option>
              </select>
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setMetricUnit('hours')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  metricUnit === 'hours'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Hours
              </button>
              <button
                type="button"
                onClick={() => setMetricUnit('days')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  metricUnit === 'days'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Days
              </button>
            </div>
          </div>
        </div>

        {/* 4 Executive Metric Insights Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Total Volume Tracked</span>
              <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalVolume}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{clearanceRate}%</span> cleared or dispatched
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Avg Turnaround Time</span>
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-300">
              {metricUnit === 'hours' ? `${overallAvgHours} hrs` : `${(Number(overallAvgHours) / 24).toFixed(1)} days`}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Across all incoming & active documents
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Top Active Division</span>
              <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white truncate" title={topDepartment}>
              {topDepartment}
            </div>
            <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-1">
              {topDeptCount} documents ({totalVolume > 0 ? Math.round((topDeptCount / totalVolume) * 100) : 0}% of volume)
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>Pending Action</span>
              <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-400">{pendingClearance}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Requires review, remark or clearance
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Grid: Volume by Department & Avg Processing Time by Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: Document Volume by Department */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Document Volume by Department</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Document distribution and routing load per division</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {departmentVolumeData.length} Departments
              </span>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentVolumeData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b833" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis
                    dataKey="department"
                    type="category"
                    tick={{ fontSize: 11, fill: '#64748b', width: 140 }}
                    width={130}
                    tickFormatter={(val) => (val.length > 20 ? `${val.slice(0, 18)}...` : val)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 dark:bg-slate-950 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 min-w-[200px] border border-slate-700">
                            <p className="font-bold text-sm text-sky-300 border-b border-slate-700 pb-1">
                              {data.department}
                            </p>
                            <p className="flex justify-between pt-1">
                              <span className="text-slate-400">Total Registered:</span>
                              <span className="font-bold text-white">{data.total} docs</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Under Review:</span>
                              <span className="font-medium text-blue-300">{data.underReview}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Supervisor Remarks:</span>
                              <span className="font-medium text-amber-300">{data.supervisorReview}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Cleared / Dispatched:</span>
                              <span className="font-medium text-emerald-300">{data.cleared}</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="cleared" name="Cleared / Completed" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="underReview" name="Under Review" stackId="a" fill="#2563eb" />
                  <Bar dataKey="supervisorReview" name="Supervisor Review" stackId="a" fill="#d97706" />
                  <Bar dataKey="inProgress" name="Intake / Routing" stackId="a" fill="#64748b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Cleared
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block ml-2" /> Under Review
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block ml-2" /> Remarks
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{totalVolume} Total Inflow</span>
          </div>
        </div>

        {/* CHART 2: Average Processing Time per Priority Level */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                  <Timer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Avg Processing Time per Priority Level
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Turnaround time benchmarked against target SLA standards
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Unit: {metricUnit === 'hours' ? 'Hours' : 'Days'}
              </span>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priorityProcessingData}
                  margin={{ top: 15, right: 15, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b833" />
                  <XAxis
                    dataKey="priority"
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{
                      value: metricUnit === 'hours' ? 'Hours' : 'Days',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 15,
                      fontSize: 10,
                      fill: '#94a3b8',
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-900 dark:bg-slate-950 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[200px] border border-slate-700">
                            <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                              <span className="font-bold text-sm text-white">{item.priority} Priority</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                {item.count} docs
                              </span>
                            </div>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Actual Turnaround:</span>
                              <span className="font-bold text-white">
                                {metricUnit === 'hours' ? `${item.avgHours} hrs` : `${item.avgDays} days`}
                              </span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">Target SLA:</span>
                              <span className="font-semibold text-slate-300">
                                {metricUnit === 'hours' ? `≤ ${item.targetSlaHours} hrs` : `≤ ${(item.targetSlaHours / 24).toFixed(1)} days`}
                              </span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-slate-400">On-Time SLA Rate:</span>
                              <span
                                className={`font-bold ${
                                  item.onTimeRate >= 85
                                    ? 'text-emerald-400'
                                    : item.onTimeRate >= 60
                                    ? 'text-amber-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                {item.onTimeRate}%
                              </span>
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={metricUnit === 'hours' ? 4 : 4 / 24}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: 'Rush SLA (4h)', position: 'right', fill: '#ef4444', fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={metricUnit === 'hours' ? 8 : 8 / 24}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{ value: 'Urgent SLA (8h)', position: 'right', fill: '#f59e0b', fontSize: 10 }}
                  />
                  <Bar
                    dataKey={metricUnit === 'hours' ? 'avgHours' : 'avgDays'}
                    name="Average Turnaround"
                    radius={[6, 6, 0, 0]}
                  >
                    {priorityProcessingData.map((entry) => (
                      <Cell
                        key={`cell-${entry.priority}`}
                        fill={PRIORITY_COLORS[entry.priority] || '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Rush target: &lt;4 hours | Urgent: &lt;8 hours | Routine: &lt;24 hours
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Total Priority Records: {priorityProcessingData.reduce((a, b) => a + b.count, 0)}
            </span>
          </div>
        </div>

      </div>

      {/* Secondary Row: Actionable Insights Table & Document Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Priority SLA Performance & Actionable Insights Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Management SLA Performance & Actionable Directives
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Detailed evaluation per priority grade with recommended administrative interventions
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-y border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Priority Grade</th>
                  <th className="py-2.5 px-3 text-center">Volume</th>
                  <th className="py-2.5 px-3 text-center">Avg Time</th>
                  <th className="py-2.5 px-3 text-center">Target SLA</th>
                  <th className="py-2.5 px-3 text-center">Compliance</th>
                  <th className="py-2.5 px-3">Leadership Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {priorityProcessingData.map((row) => (
                  <tr key={row.priority} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: PRIORITY_COLORS[row.priority] }}
                        />
                        <span className="font-bold text-slate-900 dark:text-white">{row.priority}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                      {row.count}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {row.avgHours} hrs
                    </td>
                    <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400">
                      ≤ {row.targetSlaHours} hrs
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          row.onTimeRate >= 80
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : row.onTimeRate >= 60
                            ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {row.onTimeRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 leading-tight">
                      {row.priority === 'Rush' && row.avgHours > 4
                        ? 'Expedite dispatch protocols. Route directly to Division Manager for fast-tracked sign-off.'
                        : row.priority === 'Rush'
                        ? 'Rush pipeline meeting target standards. Maintain dedicated messenger desk priority.'
                        : row.priority === 'Urgent' && row.avgHours > 8
                        ? 'Review supervisor bottleneck in drafting endorsement endorsements.'
                        : row.priority === 'Urgent'
                        ? 'Good momentum on urgent routing. Keep 8-hour alert active.'
                        : 'Routine files flowing smoothly within standard 24h operational window.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actionable Insights Callout */}
          <div className="mt-4 p-3.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 flex items-start gap-3 text-xs text-sky-900 dark:text-sky-200">
            <TrendingUp className="w-4 h-4 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Key Management Insight:</span> Documents originating from or addressed to{' '}
              <strong>{topDepartment}</strong> account for {topDeptCount} files ({totalVolume > 0 ? Math.round((topDeptCount / totalVolume) * 100) : 0}% of overall agency inflow). Ensuring that review staff are assigned promptly prevents desk congestion and minimizes backlog.
            </div>
          </div>
        </div>

        {/* Document Classification Pie Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <PieIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Document Classification</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Volume share by document type</p>
                </div>
              </div>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={documentTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {documentTypeData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0];
                        return (
                          <div className="bg-slate-900 dark:bg-slate-950 text-white p-2.5 rounded-xl shadow-lg text-xs border border-slate-700">
                            <span className="font-bold text-sky-300">{item.name}</span>
                            <div className="text-slate-300">
                              {item.value} documents (
                              {totalVolume > 0 ? Math.round(((item.value as number) / totalVolume) * 100) : 0}%)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend breakdown list */}
            <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto pr-1">
              {documentTypeData.slice(0, 5).map((type, idx) => (
                <div key={type.name} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: DEPARTMENT_COLORS[idx % DEPARTMENT_COLORS.length] }}
                    />
                    <span className="truncate">{type.name}</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-white ml-2">{type.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{documentTypeData.length} document types</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{totalVolume} total</span>
          </div>
        </div>

      </div>

    </div>
  );
};
