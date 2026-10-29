// src/components/TeacherCohortView.jsx
import React, { useState, useMemo } from 'react';
import StudentCard from './StudentCard.jsx';
import { buildSmallGroups } from '../utils/sbacData.js';
import { 
  Target, 
  BookOpen, 
  Calculator, 
  Printer, 
  Copy, 
  Check, 
  Filter, 
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function TeacherCohortView({
  students,
  gradeBand,
  subjectFocus,
  user,
  onStudentClick,
  activeStaffFilter,
  onClearStaffFilter
}) {
  // Elementary view state
  const [elemSubject, setElemSubject] = useState(subjectFocus === 'MATH' ? 'MATH' : 'ELA');
  const [selectedTeacher, setSelectedTeacher] = useState(
    activeStaffFilter?.staffName || (user?.role === 'ElementaryTeacher' ? user.name : 'ALL')
  );
  const [copiedGroup, setCopiedGroup] = useState(false);

  // Secondary (Middle & High) view state
  const [secGradeCohort, setSecGradeCohort] = useState('ALL');
  const [secSubjectTier, setSecSubjectTier] = useState('ALL'); // 'ALL' | 1 | 2 | 3 | 4 | 'BUBBLE'
  const [secCounselor, setSecCounselor] = useState(
    activeStaffFilter?.staffLabel === 'Counselor' ? activeStaffFilter.staffName : 'ALL'
  );
  const [secFlagFilter, setSecFlagFilter] = useState('ALL'); // 'ALL' | 'SPED' | '504' | 'EL' | 'FOSTER'
  const [secPreset, setSecPreset] = useState(null); // '9th_baseline' | '11th_checkpoint'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 24;

  // Teachers list for Elementary
  const teachersList = useMemo(() => {
    const set = new Set();
    students.forEach(s => {
      if (s.staffName) set.add(s.staffName);
    });
    return [...set].sort();
  }, [students]);

  // Counselors list for Middle/High
  const counselorsList = useMemo(() => {
    const set = new Set();
    students.forEach(s => {
      if (s.staffLabel === 'Counselor' && s.staffName) set.add(s.staffName);
    });
    return [...set].sort();
  }, [students]);

  // Available grades in this cohort
  const gradesList = useMemo(() => {
    const set = new Set(students.map(s => s.grade).filter(Boolean));
    return [...set].sort((a, b) => a - b);
  }, [students]);

  // Elementary filtered students
  const elemFilteredStudents = useMemo(() => {
    let list = students;
    if (selectedTeacher !== 'ALL') {
      list = list.filter(s => s.staffName === selectedTeacher);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || String(s.studentId).includes(q));
    }
    return list;
  }, [students, selectedTeacher, searchQuery]);

  // Elementary Small Groups grouped by performance tier
  const smallGroups = useMemo(() => {
    return buildSmallGroups(elemFilteredStudents, elemSubject);
  }, [elemFilteredStudents, elemSubject]);

  // Secondary Filtered students
  const secFilteredStudents = useMemo(() => {
    let list = students;

    // Preset filter overrides
    if (secPreset === '9th_baseline') {
      list = list.filter(s => s.grade === 9);
    } else if (secPreset === '11th_checkpoint') {
      list = list.filter(s => s.grade === 11);
    } else if (secGradeCohort !== 'ALL') {
      list = list.filter(s => s.grade === Number(secGradeCohort));
    }

    if (secCounselor !== 'ALL') {
      list = list.filter(s => s.staffName === secCounselor);
    }

    if (secFlagFilter === 'SPED') {
      list = list.filter(s => s.flags?.sped);
    } else if (secFlagFilter === '504') {
      list = list.filter(s => s.flags?.plan504);
    } else if (secFlagFilter === 'EL') {
      list = list.filter(s => s.flags?.elStatus === 'LEP' || s.flags?.elStatus === 'EL');
    } else if (secFlagFilter === 'FOSTER') {
      list = list.filter(s => s.flags?.homelessFoster);
    }

    if (secSubjectTier !== 'ALL') {
      if (secSubjectTier === 'BUBBLE') {
        list = list.filter(s => {
          const ela = s.latestEla?.performanceLevel === 2;
          const math = s.latestMath?.performanceLevel === 2;
          return ela || math;
        });
      } else {
        const lvl = Number(secSubjectTier);
        list = list.filter(s => {
          if (subjectFocus === 'ELA') return s.latestEla?.performanceLevel === lvl;
          if (subjectFocus === 'MATH') return s.latestMath?.performanceLevel === lvl;
          return s.latestEla?.performanceLevel === lvl || s.latestMath?.performanceLevel === lvl;
        });
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || String(s.studentId).includes(q));
    }

    return list;
  }, [students, secPreset, secGradeCohort, secCounselor, secFlagFilter, secSubjectTier, subjectFocus, searchQuery]);

  // Paginated students for Secondary view
  const totalPages = Math.ceil(secFilteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return secFilteredStudents.slice(start, start + pageSize);
  }, [secFilteredStudents, currentPage]);

  const handleCopySmallGroups = () => {
    let text = `WVUSD Small-Group Intervention Plan\n`;
    text += `Educator: ${selectedTeacher} | Subject: ${elemSubject}\n`;
    text += `Generated: ${new Date().toLocaleDateString()}\n\n`;

    for (const key of [1, 2, 3, 4]) {
      const tier = smallGroups[key];
      text += `=== ${tier.title} (${tier.students.length} students) ===\n`;
      tier.students.forEach(s => {
        const score = s.activeTest?.scaledScore || 'Untested';
        const bubble = s.isBubble ? ' [BUBBLE TARGET]' : '';
        text += `• ${s.name} (Gr ${s.grade}, ID #${s.studentId}) - Scaled Score: ${score}${bubble}\n`;
      });
      text += `\n`;
    }

    navigator.clipboard.writeText(text);
    setCopiedGroup(true);
    setTimeout(() => setCopiedGroup(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* View Header with contextual controls */}
      {gradeBand === 'Elementary' ? (
        /* ================= ELEMENTARY SMALL-GROUP BUILDER ================= */
        <div className="space-y-5">
          {/* Elementary Controls Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Elementary Grades 3–5
                </span>
                {activeStaffFilter && (
                  <button
                    onClick={onClearStaffFilter}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Small-Group Intervention & Tier Builder
              </h3>
              <p className="text-xs text-slate-500">
                Automatically sorts classroom students into 4 SBAC tiers and highlights high-leverage Bubble Students.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Teacher Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Teacher:</label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Classrooms ({teachersList.length} Teachers)</option>
                  {teachersList.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Subject Toggle */}
              <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setElemSubject('ELA')}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    elemSubject === 'ELA'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>ELA Groups</span>
                </button>
                <button
                  onClick={() => setElemSubject('MATH')}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    elemSubject === 'MATH'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Math Groups</span>
                </button>
              </div>

              {/* Actions */}
              <button
                onClick={handleCopySmallGroups}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                title="Copy structured small-group roster for lesson planning"
              >
                {copiedGroup ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied Plan!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Groups</span>
                  </>
                )}
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition-all no-print"
                title="Print small group roster"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* 4-Tier Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Tier 1: Intensive Intervention (Level 1) */}
            <div className="bg-red-50/40 border border-red-200/80 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-red-200/60 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                    <h4 className="font-bold text-red-950 text-sm">
                      Tier 1: Intensive Support
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                    {smallGroups[1].students.length}
                  </span>
                </div>
                <p className="text-[11px] text-red-700 mb-3">
                  Level 1 (Standard Not Met). Priority target for phonemic / foundational computational remediation.
                </p>

                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {smallGroups[1].students.map(s => (
                    <StudentCard
                      key={s.studentId}
                      student={s}
                      subjectFocus={elemSubject}
                      onClick={() => onStudentClick(s)}
                    />
                  ))}
                  {smallGroups[1].students.length === 0 && (
                    <div className="py-8 text-center text-xs text-red-400 italic">
                      No students in Tier 1.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tier 2: Strategic Intervention & Bubble Students (Level 2) */}
            <div className="bg-amber-50/50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col justify-between relative shadow-sm">
              <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span>Highest Leverage</span>
              </div>

              <div>
                <div className="flex items-center justify-between pb-3 border-b border-amber-200/80 mb-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                    <h4 className="font-bold text-amber-950 text-sm">
                      Tier 2: Bubble / Strategic
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    {smallGroups[2].students.length}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 mb-3">
                  Level 2 (Nearly Met). Highlighted students are closest to Crossing into Standard Met (Proficient).
                </p>

                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {smallGroups[2].students.map(s => (
                    <StudentCard
                      key={s.studentId}
                      student={s}
                      subjectFocus={elemSubject}
                      onClick={() => onStudentClick(s)}
                    />
                  ))}
                  {smallGroups[2].students.length === 0 && (
                    <div className="py-8 text-center text-xs text-amber-400 italic">
                      No students in Tier 2.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tier 3: Benchmark Mastery (Level 3) */}
            <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <h4 className="font-bold text-emerald-950 text-sm">
                      Tier 3: Benchmark Proficient
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {smallGroups[3].students.length}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 mb-3">
                  Level 3 (Standard Met). Demonstrates core grade-level California state standards mastery.
                </p>

                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {smallGroups[3].students.map(s => (
                    <StudentCard
                      key={s.studentId}
                      student={s}
                      subjectFocus={elemSubject}
                      onClick={() => onStudentClick(s)}
                    />
                  ))}
                  {smallGroups[3].students.length === 0 && (
                    <div className="py-8 text-center text-xs text-emerald-400 italic">
                      No students in Tier 3.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tier 4: Advanced Enrichment (Level 4) */}
            <div className="bg-blue-50/40 border border-blue-200/80 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-blue-200/60 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                    <h4 className="font-bold text-blue-950 text-sm">
                      Tier 4: Advanced Enrichment
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    {smallGroups[4].students.length}
                  </span>
                </div>
                <p className="text-[11px] text-blue-700 mb-3">
                  Level 4 (Standard Exceeded). Candidate cohort for accelerated inquiry and deep conceptual enrichment.
                </p>

                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {smallGroups[4].students.map(s => (
                    <StudentCard
                      key={s.studentId}
                      student={s}
                      subjectFocus={elemSubject}
                      onClick={() => onStudentClick(s)}
                    />
                  ))}
                  {smallGroups[4].students.length === 0 && (
                    <div className="py-8 text-center text-xs text-blue-400 italic">
                      No students in Tier 4.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= SECONDARY (MIDDLE & HIGH SCHOOL) COHORT VIEW ================= */
        <div className="space-y-5">
          {/* Secondary Filter & Preset Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    {gradeBand === 'Middle' ? 'Middle School Grades 6–8' : 'High School Grades 9–12'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Secondary Department & Counselor Cohort Navigator
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {gradeBand === 'High' ? 'High School Cohort & Readiness Tracking' : 'Middle School Transition & Caseload Tracking'}
                </h3>
              </div>

              {/* High School Quick Presets */}
              {gradeBand === 'High' && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Quick Presets:</span>
                  <button
                    onClick={() => {
                      if (secPreset === '9th_baseline') {
                        setSecPreset(null);
                      } else {
                        setSecPreset('9th_baseline');
                        setSecGradeCohort('9');
                      }
                      setCurrentPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      secPreset === '9th_baseline'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <span>🚀 Incoming 9th Baseline (8th Grade SBAC)</span>
                  </button>

                  <button
                    onClick={() => {
                      if (secPreset === '11th_checkpoint') {
                        setSecPreset(null);
                      } else {
                        setSecPreset('11th_checkpoint');
                        setSecGradeCohort('11');
                      }
                      setCurrentPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      secPreset === '11th_checkpoint'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    <span>🎯 11th Grade CAASPP Checkpoint</span>
                  </button>
                </div>
              )}
            </div>

            {/* Multi-Dimensional Secondary Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs">
              {/* Grade Cohort */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Grade Cohort:</label>
                <select
                  value={secGradeCohort}
                  onChange={(e) => {
                    setSecGradeCohort(e.target.value);
                    setSecPreset(null);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="ALL">All Grades in Band</option>
                  {gradesList.map(g => (
                    <option key={g} value={g}>Grade {g}</option>
                  ))}
                </select>
              </div>

              {/* Subject Performance Tier */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Subject Performance Tier:
                </label>
                <select
                  value={secSubjectTier}
                  onChange={(e) => {
                    setSecSubjectTier(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="ALL">All Performance Tiers</option>
                  <option value="1">Level 1: Standard Not Met</option>
                  <option value="2">Level 2: Standard Nearly Met</option>
                  <option value="BUBBLE">Level 2 Bubble Students</option>
                  <option value="3">Level 3: Standard Met (Proficient)</option>
                  <option value="4">Level 4: Standard Exceeded</option>
                </select>
              </div>

              {/* Counselor Caseload */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Counselor Caseload:</label>
                <select
                  value={secCounselor}
                  onChange={(e) => {
                    setSecCounselor(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="ALL">All Counselors ({counselorsList.length})</option>
                  {counselorsList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Demographic Flags */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Demographic Support Flag:</label>
                <select
                  value={secFlagFilter}
                  onChange={(e) => {
                    setSecFlagFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="ALL">All Student Demographics</option>
                  <option value="SPED">Special Education (IEP)</option>
                  <option value="504">Section 504 Accommodations</option>
                  <option value="EL">Active English Learner (LEP)</option>
                  <option value="FOSTER">Foster / Homeless Program</option>
                </select>
              </div>

              {/* Student Search */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Search Cohort:</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name or ID..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Results Counter and Filter Reset */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="font-medium text-slate-500">
                Showing <strong className="text-slate-900 font-mono">{secFilteredStudents.length.toLocaleString()}</strong> students matching criteria
              </span>

              {(secGradeCohort !== 'ALL' || secSubjectTier !== 'ALL' || secCounselor !== 'ALL' || secFlagFilter !== 'ALL' || secPreset || searchQuery) && (
                <button
                  onClick={() => {
                    setSecGradeCohort('ALL');
                    setSecSubjectTier('ALL');
                    setSecCounselor('ALL');
                    setSecFlagFilter('ALL');
                    setSecPreset(null);
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          </div>

          {/* Student Cards Grid */}
          {paginatedStudents.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center">
              <Filter className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h4 className="text-base font-bold text-slate-700">No students found matching filters</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try widening your cohort filters or resetting the subject performance tier.
              </p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedStudents.map(student => (
                  <StudentCard
                    key={student.studentId}
                    student={student}
                    subjectFocus={subjectFocus}
                    onClick={() => onStudentClick(student)}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="bg-white border border-slate-200/80 rounded-xl p-3 mt-6 flex items-center justify-between shadow-sm text-xs">
                  <span className="text-slate-500">
                    Page <strong className="text-slate-900">{currentPage}</strong> of <strong className="text-slate-900">{totalPages}</strong> ({secFilteredStudents.length} total students)
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1 px-2 font-mono font-medium">
                      <span>{currentPage}</span> / <span>{totalPages}</span>
                    </div>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
