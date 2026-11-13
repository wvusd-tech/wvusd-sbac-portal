// src/components/StudentCard.jsx
import React from 'react';
import { PERFORMANCE_LEVELS, isBubbleStudent } from '../config.js';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  User, 
  ShieldAlert, 
  FileText, 
  Languages, 
  Home, 
  ExternalLink,
  Compass
} from 'lucide-react';

export default function StudentCard({ student, subjectFocus = 'ALL', onClick }) {
  if (!student) return null;

  const { 
    name = 'Unknown Student', 
    studentId = '—', 
    grade = '—', 
    staffLabel, 
    staffName, 
    flags = {}, 
    latestEla, 
    latestMath, 
    elaDelta, 
    mathDelta,
    elaHistory = [],
    mathHistory = []
  } = student;

  const sortedElaHistory = [...(elaHistory || [])].sort((a, b) => {
    const yDiff = (a.year || 0) - (b.year || 0);
    if (yDiff !== 0) return yDiff;
    return (a.dateTaken ? new Date(a.dateTaken).getTime() : 0) - (b.dateTaken ? new Date(b.dateTaken).getTime() : 0);
  });

  const sortedMathHistory = [...(mathHistory || [])].sort((a, b) => {
    const yDiff = (a.year || 0) - (b.year || 0);
    if (yDiff !== 0) return yDiff;
    return (a.dateTaken ? new Date(a.dateTaken).getTime() : 0) - (b.dateTaken ? new Date(b.dateTaken).getTime() : 0);
  });

  const isElaBubble = latestEla?.scaledScore ? isBubbleStudent(latestEla.scaledScore, grade, 'ELA') : false;
  const isMathBubble = latestMath?.scaledScore ? isBubbleStudent(latestMath.scaledScore, grade, 'Math') : false;
  const showBubbleBadge = subjectFocus === 'ELA' ? isElaBubble : subjectFocus === 'MATH' ? isMathBubble : (isElaBubble || isMathBubble);

  const getDeltaPill = (delta, label) => {
    if (delta === null || delta === undefined) {
      return (
        <span className="text-[11px] text-slate-400 font-mono">
          {label}: —
        </span>
      );
    }
    const isPositive = delta > 0;
    const isNegative = delta < 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono border ${
          isPositive
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : isNegative
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}
        title={`Year-over-Year Scale Score Change: ${isPositive ? '+' : ''}${delta} pts`}
      >
        {isPositive ? (
          <TrendingUp className="w-3 h-3 text-emerald-600" />
        ) : isNegative ? (
          <TrendingDown className="w-3 h-3 text-rose-600" />
        ) : null}
        <span>{label} {isPositive ? `+${delta}` : delta}</span>
      </span>
    );
  };

  const getLevelBadge = (level) => {
    if (!level || !PERFORMANCE_LEVELS[level]) {
      return (
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded border border-slate-200">
          Untested
        </span>
      );
    }
    const conf = PERFORMANCE_LEVELS[level];
    return (
      <span
        className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${conf.badgeClass}`}
      >
        L{conf.level} · {conf.shortLabel}
      </span>
    );
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-blue-400 transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top row: Name, Grade & Bubble tag */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
              {name}
            </h4>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
              <span>ID: #{studentId}</span>
              <span>•</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold font-sans">
                Gr {grade}
              </span>
            </div>
          </div>

          {showBubbleBadge && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 shadow-xs animate-pulse-subtle shrink-0"
              title="Bubble Student: Nearly Met (Level 2) within 25 scale score points of Level 3 Standard Met"
            >
              <Target className="w-3 h-3 text-amber-600" />
              <span>Bubble</span>
            </span>
          )}
        </div>

        {/* Staff badge (Teacher or Counselor) */}
        {staffName && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 mb-2.5">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-500">{staffLabel || 'Staff'}:</span>
            <span className="font-semibold text-slate-700 truncate">{staffName}</span>
          </div>
        )}

        {/* Demographic/Program Indicator Badges (SPED, 504, EL Status, Homeless/Foster) */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3 min-h-[22px]">
          {flags?.sped && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-purple-100 text-purple-800 border border-purple-200">
              <ShieldAlert className="w-2.5 h-2.5 text-purple-600" />
              SPED (IEP)
            </span>
          )}
          {flags?.plan504 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
              <FileText className="w-2.5 h-2.5 text-indigo-600" />
              504 Plan
            </span>
          )}
          {flags?.elStatus && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md border ${
              flags.elStatus === 'LEP' || flags.elStatus === 'EL'
                ? 'bg-amber-100 text-amber-800 border-amber-200' 
                : 'bg-teal-100 text-teal-800 border-teal-200'
            }`}>
              <Languages className="w-2.5 h-2.5" />
              {flags.elStatus === 'LEP' ? 'Active EL' : flags.elStatus}
            </span>
          )}
          {flags?.homelessFoster && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 text-rose-800 border border-rose-200">
              <Home className="w-2.5 h-2.5 text-rose-600" />
              Foster/Home
            </span>
          )}
          {!flags?.sped && !flags?.plan504 && !flags?.elStatus && !flags?.homelessFoster && (
            <span className="text-[10px] text-slate-400 font-medium px-1">GenEd</span>
          )}
        </div>
      </div>

      {/* Scores & Deltas Bottom Section */}
      <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
        {/* ELA Row & Historical Progression */}
        {(subjectFocus === 'ALL' || subjectFocus === 'ELA') && (
          <div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700 w-9">ELA:</span>
                <span className="font-mono font-bold text-slate-900">
                  {latestEla?.scaledScore ? latestEla.scaledScore : '—'}
                </span>
                {getLevelBadge(latestEla?.performanceLevel)}
              </div>
              {getDeltaPill(elaDelta, 'YoY')}
            </div>

            {/* ELA Longitudinal Multi-Year History Chips */}
            {sortedElaHistory.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pt-1 pb-0.5 no-scrollbar">
                {sortedElaHistory.map((rec, idx) => {
                  const isLatest = idx === sortedElaHistory.length - 1;
                  const conf = PERFORMANCE_LEVELS[rec.performanceLevel];
                  const yrLabel = rec.year ? `'${String(rec.year).slice(-2)}` : (rec.dateTaken ? `'${rec.dateTaken.split('/').pop().slice(-2)}` : '—');
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono shrink-0 transition-all ${
                        isLatest 
                          ? (conf ? `${conf.badgeClass} ring-1 ring-current font-bold shadow-2xs` : 'bg-blue-50 text-blue-800 border-blue-200 font-bold')
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                      title={`Grade ${rec.testGrade || '—'} (${rec.dateTaken || rec.year}): Scale Score ${rec.scaledScore}${conf ? ` · ${conf.label}` : ''}${isLatest ? ' (Latest)' : ''}`}
                    >
                      <span className="font-sans font-bold text-[9px] text-slate-400">{yrLabel}</span>
                      <span className="font-bold">{rec.scaledScore}</span>
                      {rec.performanceLevel && (
                        <span className={`text-[9px] px-1 py-0.2 rounded font-extrabold ${conf ? conf.barColor + ' text-white' : 'bg-slate-400 text-white'}`}>
                          L{rec.performanceLevel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Math Row & Historical Progression */}
        {(subjectFocus === 'ALL' || subjectFocus === 'MATH') && (
          <div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700 w-9">Math:</span>
                <span className="font-mono font-bold text-slate-900">
                  {latestMath?.scaledScore ? latestMath.scaledScore : '—'}
                </span>
                {getLevelBadge(latestMath?.performanceLevel)}
              </div>
              {getDeltaPill(mathDelta, 'YoY')}
            </div>

            {/* Math Longitudinal Multi-Year History Chips */}
            {sortedMathHistory.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pt-1 pb-0.5 no-scrollbar">
                {sortedMathHistory.map((rec, idx) => {
                  const isLatest = idx === sortedMathHistory.length - 1;
                  const conf = PERFORMANCE_LEVELS[rec.performanceLevel];
                  const yrLabel = rec.year ? `'${String(rec.year).slice(-2)}` : (rec.dateTaken ? `'${rec.dateTaken.split('/').pop().slice(-2)}` : '—');
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono shrink-0 transition-all ${
                        isLatest 
                          ? (conf ? `${conf.badgeClass} ring-1 ring-current font-bold shadow-2xs` : 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold')
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                      title={`Grade ${rec.testGrade || '—'} (${rec.dateTaken || rec.year}): Scale Score ${rec.scaledScore}${conf ? ` · ${conf.label}` : ''}${isLatest ? ' (Latest)' : ''}`}
                    >
                      <span className="font-sans font-bold text-[9px] text-slate-400">{yrLabel}</span>
                      <span className="font-bold">{rec.scaledScore}</span>
                      {rec.performanceLevel && (
                        <span className={`text-[9px] px-1 py-0.2 rounded font-extrabold ${conf ? conf.barColor + ' text-white' : 'bg-slate-400 text-white'}`}>
                          L{rec.performanceLevel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Latest Math Placement Badge if Available */}
        {student.latestMathPlacement && (
          <div className="flex items-center justify-between text-xs bg-indigo-50/70 border border-indigo-100 rounded-lg px-2 py-1 mt-1">
            <div className="flex items-center gap-1.5 truncate">
              <Compass className="w-3 h-3 text-indigo-600 shrink-0" />
              <span className="text-[10px] font-bold text-indigo-900 truncate">
                {student.latestMathPlacement.testLabel?.replace(' Placement', '') || 'Math Plmt'}:
              </span>
              <span className="font-mono font-bold text-[11px] text-indigo-800">
                {student.latestMathPlacement.rawScore}
              </span>
              {student.latestMathPlacement.percent !== null && (
                <span className="text-[10px] text-indigo-600 font-mono">
                  ({student.latestMathPlacement.percent}%)
                </span>
              )}
            </div>
            {student.latestMathPlacement.recommendedClass && (
              <span className="text-[10px] font-semibold text-indigo-700 bg-white/80 px-1.5 py-0.5 rounded border border-indigo-200/60 truncate max-w-[110px]" title={student.latestMathPlacement.recommendedClass}>
                {student.latestMathPlacement.recommendedClass}
              </span>
            )}
          </div>
        )}

        {/* Quick Action Button for Modal Inspection */}
        <div className="pt-1.5 flex items-center justify-between border-t border-slate-100/60 mt-1">
          <span className="text-[10px] text-slate-400 font-mono">
            Longitudinal CAASPP
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(student);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-800 transition-colors"
          >
            <span>Inspect Scores</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
