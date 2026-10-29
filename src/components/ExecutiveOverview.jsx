// src/components/ExecutiveOverview.jsx
import React, { useState, useMemo } from 'react';
import { computeKPISummary, computeStaffBreakdown } from '../utils/sbacData.js';
import { 
  Users, 
  Award, 
  TrendingUp, 
  Target, 
  Search, 
  ArrowUpDown, 
  ChevronRight,
  ShieldAlert,
  Languages,
  FileText
} from 'lucide-react';

export default function ExecutiveOverview({ 
  students, 
  gradeBand, 
  subjectFocus, 
  onSelectStaff, 
  onSelectLevelFilter 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('total');
  const [sortAsc, setSortAsc] = useState(false);
  const [activeLevelFilter, setActiveLevelFilter] = useState(null);

  // Compute overall KPI metrics
  const kpi = useMemo(() => computeKPISummary(students, subjectFocus), [students, subjectFocus]);

  // Compute staff / cohort breakdown table
  const staffRows = useMemo(() => computeStaffBreakdown(students, gradeBand), [students, gradeBand]);

  // Filtered and sorted staff rows
  const filteredStaffRows = useMemo(() => {
    let rows = staffRows;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(r => 
        r.staffName.toLowerCase().includes(q) || 
        String(r.grade).includes(q) ||
        r.school.toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      valA = valA ?? -9999;
      valB = valB ?? -9999;
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [staffRows, searchTerm, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleLevelClick = (level) => {
    const next = activeLevelFilter === level ? null : level;
    setActiveLevelFilter(next);
    if (onSelectLevelFilter) {
      onSelectLevelFilter(next);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Students */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Filtered Cohort
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight font-mono">
            {kpi.total.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">{kpi.studentsWithScore.toLocaleString()}</span> with CAASPP score data
          </div>
        </div>

        {/* Card 2: Met / Exceeded Rate */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-full -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              % Standard Met / Exceeded
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 tracking-tight font-mono">
              {kpi.metExceededPct}%
            </span>
            <span className="text-xs font-semibold text-slate-500">
              (L3 & L4)
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span className="font-semibold text-emerald-700">{kpi.metExceededCount.toLocaleString()}</span> of {kpi.studentsWithScore.toLocaleString()} proficient students
          </div>
        </div>

        {/* Card 3: Average Scale Score */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Average Scale Score
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight font-mono">
            {subjectFocus === 'ELA' 
              ? kpi.avgElaScore || '—'
              : subjectFocus === 'MATH'
              ? kpi.avgMathScore || '—'
              : kpi.avgCombinedScore || '—'}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-3">
            <span>ELA: <strong className="text-slate-800 font-mono">{kpi.avgElaScore || '—'}</strong></span>
            <span>•</span>
            <span>Math: <strong className="text-slate-800 font-mono">{kpi.avgMathScore || '—'}</strong></span>
          </div>
        </div>

        {/* Card 4: % Positive Growth */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/50 rounded-full -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              % Positive YoY Scale Growth
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 tracking-tight font-mono">
              {subjectFocus === 'ELA'
                ? kpi.elaGrowthPositivePct
                : subjectFocus === 'MATH'
                ? kpi.mathGrowthPositivePct
                : kpi.overallGrowthPositivePct}%
            </span>
            <span className="text-xs font-semibold text-slate-500">
              accelerating
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
            <span>ELA: <strong className="text-slate-800 font-mono">+{kpi.elaGrowthPositivePct}%</strong></span>
            <span>•</span>
            <span>Math: <strong className="text-slate-800 font-mono">+{kpi.mathGrowthPositivePct}%</strong></span>
          </div>
        </div>
      </div>

      {/* Demographic and Special Populations Chips */}
      <div className="bg-white border border-slate-200/80 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Cohort Demographics & Support Flags:
        </span>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
            SPED (IEP): {kpi.spedCount} ({((kpi.spedCount / (kpi.total || 1)) * 100).toFixed(1)}%)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
            <Languages className="w-3.5 h-3.5 text-teal-600" />
            Active EL (LEP): {kpi.elCount} ({((kpi.elCount / (kpi.total || 1)) * 100).toFixed(1)}%)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            504 Plans: {kpi.plan504Count}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 font-semibold">
            <Target className="w-3.5 h-3.5 text-amber-600" />
            Bubble Students: {kpi.bubbleStudentsCount}
          </span>
        </div>
      </div>

      {/* Performance Level Distribution Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>California SBAC Performance Level Distribution</span>
              {activeLevelFilter && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-medium">
                  Filtering by Level {activeLevelFilter} (Click to reset)
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any color segment to highlight and inspect students in that proficiency bracket.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {subjectFocus === 'ALL' ? 'Combined Subjects' : subjectFocus === 'ELA' ? 'ELA Part 1' : 'Math Part 2'}
          </span>
        </div>

        {/* 4-Part Segmented Progress Bar */}
        <div className="h-6 w-full bg-slate-100 rounded-xl overflow-hidden flex shadow-inner border border-slate-200/60 p-0.5 gap-0.5">
          {/* Level 1: Red */}
          <div
            onClick={() => handleLevelClick(1)}
            style={{ width: `${Math.max(kpi.levelPcts[1], 2)}%` }}
            className={`h-full bg-red-500 rounded-l-lg hover:brightness-110 cursor-pointer transition-all relative group flex items-center justify-center ${
              activeLevelFilter === 1 ? 'ring-2 ring-red-400 ring-offset-1' : ''
            }`}
            title={`Level 1 (Standard Not Met): ${kpi.levelCounts[1]} students (${kpi.levelPcts[1]}%)`}
          >
            {kpi.levelPcts[1] > 6 && (
              <span className="text-[11px] font-bold text-white font-mono drop-shadow">
                {kpi.levelPcts[1]}%
              </span>
            )}
          </div>

          {/* Level 2: Amber */}
          <div
            onClick={() => handleLevelClick(2)}
            style={{ width: `${Math.max(kpi.levelPcts[2], 2)}%` }}
            className={`h-full bg-amber-500 hover:brightness-110 cursor-pointer transition-all relative group flex items-center justify-center ${
              activeLevelFilter === 2 ? 'ring-2 ring-amber-400 ring-offset-1' : ''
            }`}
            title={`Level 2 (Standard Nearly Met): ${kpi.levelCounts[2]} students (${kpi.levelPcts[2]}%)`}
          >
            {kpi.levelPcts[2] > 6 && (
              <span className="text-[11px] font-bold text-white font-mono drop-shadow">
                {kpi.levelPcts[2]}%
              </span>
            )}
          </div>

          {/* Level 3: Emerald */}
          <div
            onClick={() => handleLevelClick(3)}
            style={{ width: `${Math.max(kpi.levelPcts[3], 2)}%` }}
            className={`h-full bg-emerald-500 hover:brightness-110 cursor-pointer transition-all relative group flex items-center justify-center ${
              activeLevelFilter === 3 ? 'ring-2 ring-emerald-400 ring-offset-1' : ''
            }`}
            title={`Level 3 (Standard Met): ${kpi.levelCounts[3]} students (${kpi.levelPcts[3]}%)`}
          >
            {kpi.levelPcts[3] > 6 && (
              <span className="text-[11px] font-bold text-white font-mono drop-shadow">
                {kpi.levelPcts[3]}%
              </span>
            )}
          </div>

          {/* Level 4: Blue */}
          <div
            onClick={() => handleLevelClick(4)}
            style={{ width: `${Math.max(kpi.levelPcts[4], 2)}%` }}
            className={`h-full bg-blue-600 rounded-r-lg hover:brightness-110 cursor-pointer transition-all relative group flex items-center justify-center ${
              activeLevelFilter === 4 ? 'ring-2 ring-blue-400 ring-offset-1' : ''
            }`}
            title={`Level 4 (Standard Exceeded): ${kpi.levelCounts[4]} students (${kpi.levelPcts[4]}%)`}
          >
            {kpi.levelPcts[4] > 6 && (
              <span className="text-[11px] font-bold text-white font-mono drop-shadow">
                {kpi.levelPcts[4]}%
              </span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          {/* Level 1 Legend */}
          <button
            onClick={() => handleLevelClick(1)}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              activeLevelFilter === 1 
                ? 'bg-red-50 border-red-300 shadow-sm' 
                : 'bg-white border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
              <span className="font-bold text-slate-800">Level 1: Not Met</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between font-mono">
              <span className="text-slate-500">{kpi.levelCounts[1].toLocaleString()} students</span>
              <span className="font-bold text-red-600">{kpi.levelPcts[1]}%</span>
            </div>
          </button>

          {/* Level 2 Legend */}
          <button
            onClick={() => handleLevelClick(2)}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              activeLevelFilter === 2 
                ? 'bg-amber-50 border-amber-300 shadow-sm' 
                : 'bg-white border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
              <span className="font-bold text-slate-800">Level 2: Nearly Met</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between font-mono">
              <span className="text-slate-500">{kpi.levelCounts[2].toLocaleString()} students</span>
              <span className="font-bold text-amber-600">{kpi.levelPcts[2]}%</span>
            </div>
          </button>

          {/* Level 3 Legend */}
          <button
            onClick={() => handleLevelClick(3)}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              activeLevelFilter === 3 
                ? 'bg-emerald-50 border-emerald-300 shadow-sm' 
                : 'bg-white border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-bold text-slate-800">Level 3: Met</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between font-mono">
              <span className="text-slate-500">{kpi.levelCounts[3].toLocaleString()} students</span>
              <span className="font-bold text-emerald-600">{kpi.levelPcts[3]}%</span>
            </div>
          </button>

          {/* Level 4 Legend */}
          <button
            onClick={() => handleLevelClick(4)}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              activeLevelFilter === 4 
                ? 'bg-blue-50 border-blue-300 shadow-sm' 
                : 'bg-white border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
              <span className="font-bold text-slate-800">Level 4: Exceeded</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between font-mono">
              <span className="text-slate-500">{kpi.levelCounts[4].toLocaleString()} students</span>
              <span className="font-bold text-blue-600">{kpi.levelPcts[4]}%</span>
            </div>
          </button>
        </div>
      </div>

      {/* Grade-level and Staff Breakdown Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {gradeBand === 'Elementary'
                ? 'Elementary Staff & Teacher Roster Breakdown'
                : 'Secondary Grade Level Cohort & Counselor Caseload Analysis'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {gradeBand === 'Elementary'
                ? 'Showing self-contained classroom performance, % Met/Exceeded, and scale growth.'
                : 'Tracking counselor cohorts, transition progress, and average scale growth deltas.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={gradeBand === 'Elementary' ? 'Filter by teacher or grade...' : 'Filter by counselor or grade...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white w-64"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold select-none">
                <th 
                  onClick={() => handleSort('staffName')}
                  className="py-3 px-4 cursor-pointer hover:text-blue-600"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{gradeBand === 'Elementary' ? 'Teacher / Educator' : 'Counselor / Caseload'}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('grade')}
                  className="py-3 px-3 cursor-pointer hover:text-blue-600"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Grade</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('total')}
                  className="py-3 px-3 cursor-pointer hover:text-blue-600"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Students</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('combinedMetPct')}
                  className="py-3 px-3 cursor-pointer hover:text-blue-600"
                >
                  <div className="flex items-center gap-1.5">
                    <span>% Met/Exceeded</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('avgElaDelta')}
                  className="py-3 px-3 cursor-pointer hover:text-blue-600"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Avg ELA Delta</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('avgMathDelta')}
                  className="py-3 px-3 cursor-pointer hover:text-blue-600"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Avg Math Delta</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">School Site</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaffRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    No matching staff members or cohorts found.
                  </td>
                </tr>
              ) : (
                filteredStaffRows.map((row, idx) => {
                  const isPositiveEla = row.avgElaDelta !== null && row.avgElaDelta > 0;
                  const isNegativeEla = row.avgElaDelta !== null && row.avgElaDelta < 0;
                  const isPositiveMath = row.avgMathDelta !== null && row.avgMathDelta > 0;
                  const isNegativeMath = row.avgMathDelta !== null && row.avgMathDelta < 0;

                  return (
                    <tr 
                      key={idx}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {row.staffName.charAt(0)}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {row.staffName}
                          </div>
                          {row.staffEmail && (
                            <div className="text-[11px] text-slate-400 font-mono">
                              {row.staffEmail}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold font-mono">
                          Gr {row.grade}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {row.total}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold ${
                            row.combinedMetPct >= 70 ? 'text-emerald-600' : row.combinedMetPct >= 50 ? 'text-amber-600' : 'text-slate-700'
                          }`}>
                            {row.combinedMetPct}%
                          </span>
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                            <div 
                              style={{ width: `${row.combinedMetPct}%` }}
                              className={`h-full ${
                                row.combinedMetPct >= 70 ? 'bg-emerald-500' : row.combinedMetPct >= 50 ? 'bg-amber-500' : 'bg-blue-500'
                              }`}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {row.avgElaDelta !== null ? (
                          <span className={`inline-flex items-center gap-1 font-semibold ${
                            isPositiveEla ? 'text-emerald-600' : isNegativeEla ? 'text-rose-600' : 'text-slate-500'
                          }`}>
                            {isPositiveEla ? `+${row.avgElaDelta}` : row.avgElaDelta} pts
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {row.avgMathDelta !== null ? (
                          <span className={`inline-flex items-center gap-1 font-semibold ${
                            isPositiveMath ? 'text-emerald-600' : isNegativeMath ? 'text-rose-600' : 'text-slate-500'
                          }`}>
                            {isPositiveMath ? `+${row.avgMathDelta}` : row.avgMathDelta} pts
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-600 truncate max-w-[160px]" title={row.school}>
                        {row.school}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectStaff(row)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 shadow-sm transition-all"
                        >
                          <span>{gradeBand === 'Elementary' ? 'Open Roster' : 'View Cohort'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
