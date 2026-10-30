// src/components/TeacherCohortView.jsx
import React, { useState, useMemo } from 'react';
import StudentCard from './StudentCard.jsx';
import { isBubbleStudent, getDistanceToStandard } from '../config.js';
import { 
  ArrowLeft,
  Users, 
  BookOpen, 
  Calculator, 
  Printer, 
  Copy, 
  Check, 
  Search, 
  Target, 
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function TeacherCohortView({
  students = [],
  gradeBand = 'Elementary',
  subjectFocus = 'ALL',
  user,
  onStudentClick,
  activeStaffFilter,
  onClearStaffFilter,
  onBackToOverview
}) {
  const [activeSubject, setActiveSubject] = useState(subjectFocus === 'MATH' ? 'MATH' : subjectFocus === 'ELA' ? 'ELA' : 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTier, setCopiedTier] = useState(null);
  const [copiedAllPlan, setCopiedAllPlan] = useState(false);
  const [isTiersOpen, setIsTiersOpen] = useState(true);

  // Determine educator metadata if a teacher was selected or if logged-in user is a teacher
  const educatorName = activeStaffFilter?.staffName || (user?.role === 'ElementaryTeacher' || user?.role === 'SecondaryOrSiteTeacher' ? user?.name : null);
  const educatorEmail = activeStaffFilter?.staffEmail || (educatorName && user?.name === educatorName ? user?.email : '');
  const educatorSchool = activeStaffFilter?.school || user?.school || '';
  const educatorGrade = activeStaffFilter?.grade || '';

  // Filter students matching the active educator safely by email or name
  const educatorRoster = useMemo(() => {
    const safeStudents = Array.isArray(students) ? students.filter(Boolean) : [];
    if (!activeStaffFilter) {
      return safeStudents;
    }

    const targetEmail = (activeStaffFilter.staffEmail || '').toLowerCase().trim();
    const targetName = (activeStaffFilter.staffName || '').toLowerCase().trim();

    const matches = safeStudents.filter(s => {
      if (!s) return false;
      const sEmail = (s.staffEmail || '').toLowerCase().trim();
      const sName = (s.staffName || '').toLowerCase().trim();

      if (targetEmail && sEmail && targetEmail === sEmail) return true;
      if (targetName && sName) {
        if (targetName === sName) return true;
        const cleanTarget = targetName.replace(/[,\s]+/g, ' ');
        const cleanS = sName.replace(/[,\s]+/g, ' ');
        if (cleanTarget === cleanS) return true;
        if (cleanTarget.split(' ').reverse().join(' ') === cleanS) return true;
      }
      return false;
    });

    // If filtering by specific staff yielded matches, return them. Otherwise return safeStudents as fallback
    return matches.length > 0 ? matches : safeStudents;
  }, [students, activeStaffFilter]);

  // Search filtered roster
  const displayedStudents = useMemo(() => {
    if (!searchQuery.trim()) return educatorRoster;
    const q = searchQuery.toLowerCase().trim();
    return educatorRoster.filter(s => 
      (s.name && s.name.toLowerCase().includes(q)) || 
      (s.studentId && String(s.studentId).includes(q))
    );
  }, [educatorRoster, searchQuery]);

  // Categorize students into 4 distinct MTSS action tiers
  // Tier 1: Exceeded (Level 4 - Advanced Enrichment)
  // Tier 2: Met (Level 3 - Benchmark Proficient)
  // Tier 3: Nearly Met / Bubble Students (Level 2 - Strategic Support)
  // Tier 4: Not Met / Intensive Support Needed (Level 1 - Foundational Support)
  const tieredGroups = useMemo(() => {
    const tiers = {
      1: {
        id: 1,
        title: 'Tier 1: Standard Exceeded (Level 4)',
        subtitle: 'Advanced Enrichment & Inquiry Acceleration',
        level: 4,
        color: 'blue',
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
        cardBg: 'bg-blue-50/50 border-blue-200/80',
        dotColor: 'bg-blue-600',
        students: [],
        bubbleCount: 0
      },
      2: {
        id: 2,
        title: 'Tier 2: Standard Met (Level 3)',
        subtitle: 'Benchmark Mastery & Core Grade-Level Proficiency',
        level: 3,
        color: 'emerald',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        cardBg: 'bg-emerald-50/50 border-emerald-200/80',
        dotColor: 'bg-emerald-500',
        students: [],
        bubbleCount: 0
      },
      3: {
        id: 3,
        title: 'Tier 3: Strategic Support / Bubble Students (Level 2)',
        subtitle: 'Standard Nearly Met · High-Leverage Benchmark Candidates',
        level: 2,
        color: 'amber',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
        cardBg: 'bg-amber-50/60 border-amber-300 shadow-xs',
        dotColor: 'bg-amber-500',
        students: [],
        bubbleCount: 0
      },
      4: {
        id: 4,
        title: 'Tier 4: Intensive Support Needed (Level 1)',
        subtitle: 'Standard Not Met · Targeted Foundational Remediation',
        level: 1,
        color: 'red',
        badgeBg: 'bg-red-100 text-red-800 border-red-300',
        cardBg: 'bg-red-50/50 border-red-200/80',
        dotColor: 'bg-red-500',
        students: [],
        bubbleCount: 0
      },
      untested: {
        id: 'untested',
        title: 'Untested / Prior Year Pending',
        subtitle: 'No official CAASPP scale score record on file',
        level: 0,
        color: 'slate',
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
        cardBg: 'bg-slate-50/50 border-slate-200',
        dotColor: 'bg-slate-400',
        students: [],
        bubbleCount: 0
      }
    };

    for (const s of educatorRoster) {
      if (!s) continue;
      let level = null;
      let score = null;
      let isBubble = false;
      const subj = activeSubject === 'MATH' ? 'Math' : 'ELA';

      if (activeSubject === 'ELA') {
        level = s.latestEla?.performanceLevel;
        score = s.latestEla?.scaledScore;
        if (score) isBubble = isBubbleStudent(score, s.grade, 'ELA');
      } else if (activeSubject === 'MATH') {
        level = s.latestMath?.performanceLevel;
        score = s.latestMath?.scaledScore;
        if (score) isBubble = isBubbleStudent(score, s.grade, 'Math');
      } else {
        // Combined focus: average level or primary level
        const elaLvl = s.latestEla?.performanceLevel;
        const mathLvl = s.latestMath?.performanceLevel;
        if (elaLvl && mathLvl) {
          level = Math.round((elaLvl + mathLvl) / 2);
        } else {
          level = elaLvl || mathLvl;
        }
        const bEla = s.latestEla?.scaledScore ? isBubbleStudent(s.latestEla.scaledScore, s.grade, 'ELA') : false;
        const bMath = s.latestMath?.scaledScore ? isBubbleStudent(s.latestMath.scaledScore, s.grade, 'Math') : false;
        isBubble = bEla || bMath;
        score = s.latestEla?.scaledScore || s.latestMath?.scaledScore;
      }

      const decorated = {
        ...s,
        activeScore: score,
        isBubble,
        distanceToStandard: score ? getDistanceToStandard(score, s.grade, subj) : null
      };

      if (level === 4) {
        tiers[1].students.push(decorated);
      } else if (level === 3) {
        tiers[2].students.push(decorated);
      } else if (level === 2) {
        tiers[3].students.push(decorated);
        if (isBubble) tiers[3].bubbleCount++;
      } else if (level === 1) {
        tiers[4].students.push(decorated);
      } else {
        tiers.untested.students.push(decorated);
      }
    }

    // Sort each tier: bubble students first, then scale score
    for (const k of [1, 2, 3, 4, 'untested']) {
      tiers[k].students.sort((a, b) => {
        if (a.isBubble !== b.isBubble) return a.isBubble ? -1 : 1;
        const scoreA = a.activeScore || 0;
        const scoreB = b.activeScore || 0;
        return scoreA - scoreB;
      });
    }

    return tiers;
  }, [educatorRoster, activeSubject]);

  // Copy small-group roster for a specific tier
  const handleCopyTierRoster = (tierKey) => {
    const tier = tieredGroups[tierKey];
    if (!tier) return;

    let text = `WVUSD Small-Group Intervention Roster\n`;
    text += `Educator: ${educatorName || 'Classroom Teacher'} | School: ${educatorSchool || 'WVUSD'}\n`;
    text += `Focus: ${activeSubject === 'ALL' ? 'Combined SBAC' : activeSubject} | Group: ${tier.title}\n`;
    text += `Total Students: ${tier.students.length}\n`;
    text += `Generated: ${new Date().toLocaleDateString()}\n\n`;

    tier.students.forEach((s, idx) => {
      const bubbleStr = s.isBubble ? ' [BUBBLE TARGET]' : '';
      const flags = [];
      if (s.flags?.sped) flags.push('SPED');
      if (s.flags?.plan504) flags.push('504');
      if (s.flags?.elStatus) flags.push(`EL:${s.flags.elStatus}`);
      const flagStr = flags.length > 0 ? ` (${flags.join(', ')})` : '';
      text += `${idx + 1}. ${s.name} (ID: ${s.studentId}, Gr ${s.grade})${flagStr} - Scaled Score: ${s.activeScore || 'N/A'}${bubbleStr}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedTier(tierKey);
    setTimeout(() => setCopiedTier(null), 2000);
  };

  // Copy full 4-tier plan
  const handleCopyAllPlan = () => {
    let text = `==========================================================\n`;
    text += `WALNUT VALLEY UNIFIED SCHOOL DISTRICT\n`;
    text += `CAASPP / SBAC MULTI-TIERED INTERVENTION PLAN\n`;
    text += `Educator: ${educatorName || 'Classroom Teacher'} | School: ${educatorSchool || 'WVUSD'}\n`;
    text += `Subject Focus: ${activeSubject} | Total Roster: ${educatorRoster.length} Students\n`;
    text += `Generated: ${new Date().toLocaleDateString()}\n`;
    text += `==========================================================\n\n`;

    [1, 2, 3, 4].forEach(key => {
      const tier = tieredGroups[key];
      text += `--- ${tier.title} (${tier.students.length} students) ---\n`;
      text += `Pedagogical Focus: ${tier.subtitle}\n`;
      tier.students.forEach(s => {
        const bubble = s.isBubble ? ' [BUBBLE TARGET]' : '';
        text += `• ${s.name} (Gr ${s.grade}, ID #${s.studentId}) - Score: ${s.activeScore || 'N/A'}${bubble}\n`;
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedAllPlan(true);
    setTimeout(() => setCopiedAllPlan(false), 2000);
  };

  const handleBack = () => {
    if (onBackToOverview) {
      onBackToOverview();
    } else if (onClearStaffFilter) {
      onClearStaffFilter();
    }
  };

  // Graceful empty state when roster has 0 students
  if (educatorRoster.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-sm text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No Student Records Found
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {educatorName 
              ? `No student records are currently enrolled for ${educatorName} under the active school or grade filters.`
              : 'No students found matching the selected parameters.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Executive Overview</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Count metrics for header
  const totalRosterCount = educatorRoster.length;
  const bubbleCount = educatorRoster.filter(s => {
    const bEla = s.latestEla?.scaledScore ? isBubbleStudent(s.latestEla.scaledScore, s.grade, 'ELA') : false;
    const bMath = s.latestMath?.scaledScore ? isBubbleStudent(s.latestMath.scaledScore, s.grade, 'Math') : false;
    return bEla || bMath;
  }).length;
  const metExceededCount = educatorRoster.filter(s => {
    const lEla = s.latestEla?.performanceLevel;
    const lMath = s.latestMath?.performanceLevel;
    return (lEla && lEla >= 3) || (lMath && lMath >= 3);
  }).length;
  const metExceededPct = totalRosterCount > 0 ? Math.round((metExceededCount / totalRosterCount) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Navigation & Educator Context Header Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Back Button & Educator Profile */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 transition-all group"
              title="Return to School Executive Overview"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Overview</span>
            </button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  {educatorName || 'Classroom Educator Roster'}
                </span>
                {educatorGrade && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 font-mono">
                    Grade {educatorGrade}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                  {gradeBand} Roster
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                {educatorSchool && <span>{educatorSchool}</span>}
                {educatorEmail && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-slate-400">{educatorEmail}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAllPlan}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-xs transition-all"
              title="Copy 4-tier intervention small-group plan to clipboard"
            >
              {copiedAllPlan ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied Full Plan!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Copy MTSS Plan</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-xs transition-all no-print"
              title="Print student roster and intervention tiers"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </button>
          </div>

        </div>

        {/* Quick Snapshot Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Students</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-slate-900 font-mono">{totalRosterCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">on roster</span>
            </div>
          </div>

          <div className="bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">% Met / Exceeded</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-emerald-700 font-mono">{metExceededPct}%</span>
              <span className="text-[11px] text-emerald-600 font-medium font-mono">({metExceededCount}/{totalRosterCount})</span>
            </div>
          </div>

          <div className="bg-amber-50/60 rounded-xl p-2.5 border border-amber-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Bubble Students</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-amber-700 font-mono">{bubbleCount}</span>
              <span className="text-[11px] text-amber-800 font-medium">strategic focus</span>
            </div>
          </div>

          <div className="bg-blue-50/60 rounded-xl p-2.5 border border-blue-200/70">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Active Subject View</span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-blue-800">
              {activeSubject === 'ALL' ? 'Combined Subjects' : activeSubject === 'ELA' ? 'English Language Arts' : 'Mathematics'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Roster: Tiled Student Cards Grid */}
      <div className="space-y-4">
        {/* Roster Controls: Subject Switcher & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Student Roster Cards</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {displayedStudents.length} of {educatorRoster.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tiled student profiles featuring scaled scores, performance levels, demographic indicators, and longitudinal trajectories.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Subject Toggle */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveSubject('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeSubject === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveSubject('ELA')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  activeSubject === 'ELA'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>ELA</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubject('MATH')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  activeSubject === 'MATH'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-blue-600" />
                <span>Math</span>
              </button>
            </div>

            {/* In-Roster Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filter by student name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white w-56 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* The Tiled Cards Grid */}
        {displayedStudents.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center">
            <Filter className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No students matched search filter</h4>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your query or click reset.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedStudents.map((student) => (
              <StudentCard
                key={student.studentId || student.name}
                student={student}
                subjectFocus={activeSubject}
                onClick={() => onStudentClick?.(student)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3. Tiered Interventions Section at the Bottom */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Tier Section Accordion Header */}
        <div 
          onClick={() => setIsTiersOpen(!isTiersOpen)}
          className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition-colors border-b border-slate-100 select-none"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                Multi-Tiered Support (MTSS)
              </span>
              <span className="text-xs text-slate-400">
                Subject: <strong className="text-slate-700">{activeSubject}</strong>
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" />
              <span>Tiered Interventions & Small-Group Builder</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatically categorizes students into 4 distinct action tiers based on CAASPP standards mastery for targeted small-group instruction.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              {isTiersOpen ? 'Collapse Tiers' : 'Expand Tiers'}
            </span>
            <div className="p-1 rounded-lg bg-slate-100 text-slate-600">
              {isTiersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* 4 Distinct Action Tiers Grid */}
        {isTiersOpen && (
          <div className="p-4 sm:p-5 bg-slate-50/40">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              
              {/* Tier 1: Exceeded (Level 4) */}
              <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-blue-200/60 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                      <h4 className="font-bold text-blue-950 text-xs sm:text-sm">
                        Tier 1: Exceeded (L4)
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      {tieredGroups[1].students.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800 mb-3 leading-relaxed">
                    Standard Exceeded. Candidates for accelerated inquiry, DOK Level 3/4 tasks, and peer collaborative leadership.
                  </p>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {tieredGroups[1].students.map(s => (
                      <div
                        key={s.studentId}
                        onClick={() => onStudentClick?.(s)}
                        className="bg-white p-2.5 rounded-xl border border-blue-200/70 hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div className="truncate mr-2">
                          <span className="font-bold text-slate-800 block truncate">{s.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: #{s.studentId} · Gr {s.grade}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-blue-700">{s.activeScore || '—'}</span>
                          <span className="text-[10px] font-semibold block text-slate-400">Scale Score</span>
                        </div>
                      </div>
                    ))}
                    {tieredGroups[1].students.length === 0 && (
                      <div className="py-8 text-center text-xs text-blue-400 italic">
                        No students in Tier 1.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-blue-200/60 mt-3">
                  <button
                    type="button"
                    onClick={() => handleCopyTierRoster(1)}
                    disabled={tieredGroups[1].students.length === 0}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-700 border border-blue-300 hover:bg-blue-100 disabled:opacity-40 transition-colors"
                  >
                    {copiedTier === 1 ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTier === 1 ? 'Copied Tier 1!' : 'Copy Tier 1 Roster'}</span>
                  </button>
                </div>
              </div>

              {/* Tier 2: Met (Level 3) */}
              <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-emerald-200/60 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                      <h4 className="font-bold text-emerald-950 text-xs sm:text-sm">
                        Tier 2: Met (L3)
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {tieredGroups[2].students.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mb-3 leading-relaxed">
                    Standard Met. Benchmark mastery of California grade-level standards. Focus on maintaining growth velocity.
                  </p>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {tieredGroups[2].students.map(s => (
                      <div
                        key={s.studentId}
                        onClick={() => onStudentClick?.(s)}
                        className="bg-white p-2.5 rounded-xl border border-emerald-200/70 hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div className="truncate mr-2">
                          <span className="font-bold text-slate-800 block truncate">{s.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: #{s.studentId} · Gr {s.grade}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-emerald-700">{s.activeScore || '—'}</span>
                          <span className="text-[10px] font-semibold block text-slate-400">Scale Score</span>
                        </div>
                      </div>
                    ))}
                    {tieredGroups[2].students.length === 0 && (
                      <div className="py-8 text-center text-xs text-emerald-400 italic">
                        No students in Tier 2.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-emerald-200/60 mt-3">
                  <button
                    type="button"
                    onClick={() => handleCopyTierRoster(2)}
                    disabled={tieredGroups[2].students.length === 0}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100 disabled:opacity-40 transition-colors"
                  >
                    {copiedTier === 2 ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTier === 2 ? 'Copied Tier 2!' : 'Copy Tier 2 Roster'}</span>
                  </button>
                </div>
              </div>

              {/* Tier 3: Nearly Met & Bubble Students (Level 2) */}
              <div className="bg-amber-50/60 border-2 border-amber-300 rounded-2xl p-4 flex flex-col justify-between relative shadow-xs">
                <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  <span>Bubble Target</span>
                </div>

                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-amber-200/80 mb-2.5 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                      <h4 className="font-bold text-amber-950 text-xs sm:text-sm">
                        Tier 3: Strategic / Bubble
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      {tieredGroups[3].students.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-900 mb-3 leading-relaxed">
                    Standard Nearly Met. Highest leverage candidates within 25 points of Level 3 Standard Met.
                  </p>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {tieredGroups[3].students.map(s => (
                      <div
                        key={s.studentId}
                        onClick={() => onStudentClick?.(s)}
                        className={`p-2.5 rounded-xl border hover:shadow-xs transition-all cursor-pointer flex items-center justify-between text-xs ${
                          s.isBubble 
                            ? 'bg-amber-100/60 border-amber-300 ring-1 ring-amber-300/60' 
                            : 'bg-white border-amber-200/70 hover:border-amber-400'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-900 truncate">{s.name}</span>
                            {s.isBubble && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-200 text-amber-900 shrink-0">
                                Bubble
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">ID: #{s.studentId} · Gr {s.grade}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-amber-800">{s.activeScore || '—'}</span>
                          <span className="text-[10px] font-semibold block text-slate-400">Scale Score</span>
                        </div>
                      </div>
                    ))}
                    {tieredGroups[3].students.length === 0 && (
                      <div className="py-8 text-center text-xs text-amber-400 italic">
                        No students in Tier 3.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-amber-200/80 mt-3">
                  <button
                    type="button"
                    onClick={() => handleCopyTierRoster(3)}
                    disabled={tieredGroups[3].students.length === 0}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition-colors shadow-xs"
                  >
                    {copiedTier === 3 ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTier === 3 ? 'Copied Tier 3!' : 'Copy Bubble Roster'}</span>
                  </button>
                </div>
              </div>

              {/* Tier 4: Not Met / Intensive Support Needed (Level 1) */}
              <div className="bg-red-50/50 border border-red-200/80 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-red-200/60 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                      <h4 className="font-bold text-red-950 text-xs sm:text-sm">
                        Tier 4: Intensive Support
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                      {tieredGroups[4].students.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-red-800 mb-3 leading-relaxed">
                    Standard Not Met. Priority for intensive phonemic / foundational arithmetic remediation and SST/IEP supports.
                  </p>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {tieredGroups[4].students.map(s => (
                      <div
                        key={s.studentId}
                        onClick={() => onStudentClick?.(s)}
                        className="bg-white p-2.5 rounded-xl border border-red-200/70 hover:border-red-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between text-xs"
                      >
                        <div className="truncate mr-2">
                          <span className="font-bold text-slate-800 block truncate">{s.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: #{s.studentId} · Gr {s.grade}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-red-700">{s.activeScore || '—'}</span>
                          <span className="text-[10px] font-semibold block text-slate-400">Scale Score</span>
                        </div>
                      </div>
                    ))}
                    {tieredGroups[4].students.length === 0 && (
                      <div className="py-8 text-center text-xs text-red-400 italic">
                        No students in Tier 4.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-red-200/60 mt-3">
                  <button
                    type="button"
                    onClick={() => handleCopyTierRoster(4)}
                    disabled={tieredGroups[4].students.length === 0}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold bg-white text-red-700 border border-red-300 hover:bg-red-100 disabled:opacity-40 transition-colors"
                  >
                    {copiedTier === 4 ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTier === 4 ? 'Copied Tier 4!' : 'Copy Tier 4 Roster'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
