// src/utils/sbacData.js
import { isBubbleStudent, getDistanceToStandard } from '../config.js';

/**
 * Computes executive KPI summary metrics for an array of student objects
 */
export function computeKPISummary(students, subjectFocus = 'ALL') {
  const total = students.length;
  if (total === 0) {
    return {
      total: 0,
      metExceededCount: 0,
      metExceededPct: 0,
      levelCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
      levelPcts: { 1: 0, 2: 0, 3: 0, 4: 0 },
      avgElaScore: null,
      avgMathScore: null,
      avgCombinedScore: null,
      elaGrowthPositivePct: 0,
      mathGrowthPositivePct: 0,
      overallGrowthPositivePct: 0,
      bubbleStudentsCount: 0,
      spedCount: 0,
      elCount: 0,
      plan504Count: 0,
      homelessFosterCount: 0
    };
  }

  let metExceededCount = 0;
  let studentsWithScore = 0;
  const levelCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };

  let sumEla = 0, countEla = 0;
  let sumMath = 0, countMath = 0;

  let elaPositiveGrowth = 0, elaGrowthTested = 0;
  let mathPositiveGrowth = 0, mathGrowthTested = 0;
  let bubbleStudentsCount = 0;

  let spedCount = 0;
  let elCount = 0;
  let plan504Count = 0;
  let homelessFosterCount = 0;

  for (const s of students) {
    if (s.flags?.sped) spedCount++;
    if (s.flags?.plan504) plan504Count++;
    if (s.flags?.homelessFoster) homelessFosterCount++;
    if (s.flags?.elStatus === 'LEP' || s.flags?.elStatus === 'EL') elCount++;

    const ela = s.latestEla;
    const math = s.latestMath;

    if (ela?.scaledScore) {
      sumEla += ela.scaledScore;
      countEla++;
    }
    if (math?.scaledScore) {
      sumMath += math.scaledScore;
      countMath++;
    }

    if (s.elaDelta !== null && s.elaDelta !== undefined) {
      elaGrowthTested++;
      if (s.elaDelta > 0) elaPositiveGrowth++;
    }
    if (s.mathDelta !== null && s.mathDelta !== undefined) {
      mathGrowthTested++;
      if (s.mathDelta > 0) mathPositiveGrowth++;
    }

    // Determine performance level according to active subject focus
    let perfLevel = null;
    let isBubble = false;

    if (subjectFocus === 'ELA') {
      perfLevel = ela?.performanceLevel;
      if (ela?.scaledScore) {
        isBubble = isBubbleStudent(ela.scaledScore, s.grade, 'ELA');
      }
    } else if (subjectFocus === 'MATH') {
      perfLevel = math?.performanceLevel;
      if (math?.scaledScore) {
        isBubble = isBubbleStudent(math.scaledScore, s.grade, 'Math');
      }
    } else {
      // Combined / ALL: if either is met/exceeded, or average level
      if (ela?.performanceLevel && math?.performanceLevel) {
        const avgLvl = Math.round((ela.performanceLevel + math.performanceLevel) / 2);
        perfLevel = avgLvl;
      } else {
        perfLevel = ela?.performanceLevel || math?.performanceLevel;
      }
      const bubbleEla = ela?.scaledScore ? isBubbleStudent(ela.scaledScore, s.grade, 'ELA') : false;
      const bubbleMath = math?.scaledScore ? isBubbleStudent(math.scaledScore, s.grade, 'Math') : false;
      isBubble = bubbleEla || bubbleMath;
    }

    if (isBubble) bubbleStudentsCount++;

    if (perfLevel && perfLevel >= 1 && perfLevel <= 4) {
      levelCounts[perfLevel]++;
      studentsWithScore++;
      if (perfLevel >= 3) {
        metExceededCount++;
      }
    }
  }

  const denominator = studentsWithScore > 0 ? studentsWithScore : total;
  const metExceededPct = Number(((metExceededCount / denominator) * 100).toFixed(1));

  const levelPcts = {
    1: Number(((levelCounts[1] / denominator) * 100).toFixed(1)),
    2: Number(((levelCounts[2] / denominator) * 100).toFixed(1)),
    3: Number(((levelCounts[3] / denominator) * 100).toFixed(1)),
    4: Number(((levelCounts[4] / denominator) * 100).toFixed(1)),
  };

  const avgElaScore = countEla > 0 ? Math.round(sumEla / countEla) : null;
  const avgMathScore = countMath > 0 ? Math.round(sumMath / countMath) : null;
  const avgCombinedScore = (countEla + countMath) > 0 ? Math.round((sumEla + sumMath) / (countEla + countMath)) : null;

  const elaGrowthPositivePct = elaGrowthTested > 0 ? Number(((elaPositiveGrowth / elaGrowthTested) * 100).toFixed(1)) : 0;
  const mathGrowthPositivePct = mathGrowthTested > 0 ? Number(((mathPositiveGrowth / mathGrowthTested) * 100).toFixed(1)) : 0;

  const totalGrowthTested = elaGrowthTested + mathGrowthTested;
  const totalPositiveGrowth = elaPositiveGrowth + mathPositiveGrowth;
  const overallGrowthPositivePct = totalGrowthTested > 0 ? Number(((totalPositiveGrowth / totalGrowthTested) * 100).toFixed(1)) : 0;

  return {
    total,
    studentsWithScore,
    metExceededCount,
    metExceededPct,
    levelCounts,
    levelPcts,
    avgElaScore,
    avgMathScore,
    avgCombinedScore,
    elaGrowthPositivePct,
    mathGrowthPositivePct,
    overallGrowthPositivePct,
    bubbleStudentsCount,
    spedCount,
    elCount,
    plan504Count,
    homelessFosterCount
  };
}

/**
 * Computes breakdown rows for Staff:
 * - Elementary (3-5): Grouped by Teacher
 * - Middle (6-8) & High School (9-12): Grouped by Grade Cohort & Counselor Caseload
 */
export function computeStaffBreakdown(students, gradeBand = 'Elementary') {
  const map = new Map();

  for (const s of students) {
    const staffName = s.staffName || 'Unassigned';
    const grade = s.grade || 'N/A';
    const school = s.school || 'Unassigned';
    
    // Grouping key: in Elementary, group by Teacher + Grade.
    // In Middle / High, group by Counselor + Grade Cohort
    const key = `${staffName}___${grade}___${school}`;

    if (!map.has(key)) {
      map.set(key, {
        staffName,
        staffLabel: s.staffLabel || (gradeBand === 'Elementary' ? 'Teacher' : 'Counselor'),
        staffEmail: s.staffEmail || '',
        grade,
        school,
        total: 0,
        elaScores: [],
        mathScores: [],
        elaDeltas: [],
        mathDeltas: [],
        levelCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
        metExceededEla: 0,
        metExceededMath: 0,
        testedEla: 0,
        testedMath: 0,
      });
    }

    const group = map.get(key);
    group.total++;

    if (s.latestEla?.scaledScore) {
      group.elaScores.push(s.latestEla.scaledScore);
      group.testedEla++;
      if (s.latestEla.performanceLevel >= 3) group.metExceededEla++;
      if (s.latestEla.performanceLevel) group.levelCounts[s.latestEla.performanceLevel]++;
    }

    if (s.latestMath?.scaledScore) {
      group.mathScores.push(s.latestMath.scaledScore);
      group.testedMath++;
      if (s.latestMath.performanceLevel >= 3) group.metExceededMath++;
    }

    if (s.elaDelta !== null && s.elaDelta !== undefined) {
      group.elaDeltas.push(s.elaDelta);
    }
    if (s.mathDelta !== null && s.mathDelta !== undefined) {
      group.mathDeltas.push(s.mathDelta);
    }
  }

  const result = Array.from(map.values()).map(row => {
    const avgElaDelta = row.elaDeltas.length > 0 
      ? Number((row.elaDeltas.reduce((a, b) => a + b, 0) / row.elaDeltas.length).toFixed(1)) 
      : null;
    const avgMathDelta = row.mathDeltas.length > 0 
      ? Number((row.mathDeltas.reduce((a, b) => a + b, 0) / row.mathDeltas.length).toFixed(1)) 
      : null;
    
    const elaMetPct = row.testedEla > 0 ? Number(((row.metExceededEla / row.testedEla) * 100).toFixed(1)) : 0;
    const mathMetPct = row.testedMath > 0 ? Number(((row.metExceededMath / row.testedMath) * 100).toFixed(1)) : 0;
    
    const combinedTested = row.testedEla + row.testedMath;
    const combinedMet = row.metExceededEla + row.metExceededMath;
    const combinedMetPct = combinedTested > 0 ? Number(((combinedMet / combinedTested) * 100).toFixed(1)) : 0;

    return {
      ...row,
      avgElaDelta,
      avgMathDelta,
      elaMetPct,
      mathMetPct,
      combinedMetPct
    };
  });

  // Sort by grade, then staffName
  return result.sort((a, b) => {
    if (a.grade !== b.grade) return Number(a.grade) - Number(b.grade);
    return a.staffName.localeCompare(b.staffName);
  });
}

/**
 * Builds small-group intervention tiers for Elementary teachers
 */
export function buildSmallGroups(students, subject = 'ELA') {
  const tiers = {
    1: { level: 1, title: 'Tier 1: Intensive Intervention (Level 1)', students: [], bubbleCount: 0 },
    2: { level: 2, title: 'Tier 2: Strategic Intervention / Bubble Students (Level 2)', students: [], bubbleCount: 0 },
    3: { level: 3, title: 'Tier 3: Benchmark Mastery (Level 3)', students: [], bubbleCount: 0 },
    4: { level: 4, title: 'Tier 4: Advanced Enrichment (Level 4)', students: [], bubbleCount: 0 },
    untested: { level: 0, title: 'Untested / Prior Year Pending', students: [], bubbleCount: 0 }
  };

  for (const s of students) {
    const test = subject === 'MATH' ? s.latestMath : s.latestEla;
    const level = test?.performanceLevel;
    const isBubble = test?.scaledScore ? isBubbleStudent(test.scaledScore, s.grade, subject === 'MATH' ? 'Math' : 'ELA') : false;

    const studentWithMeta = {
      ...s,
      activeTest: test,
      isBubble,
      distanceToStandard: test?.scaledScore ? getDistanceToStandard(test.scaledScore, s.grade, subject === 'MATH' ? 'Math' : 'ELA') : null
    };

    if (level && tiers[level]) {
      tiers[level].students.push(studentWithMeta);
      if (isBubble) tiers[level].bubbleCount++;
    } else {
      tiers.untested.students.push(studentWithMeta);
    }
  }

  // Sort each tier: prioritize bubble students, then delta or score
  for (const k of [1, 2, 3, 4, 'untested']) {
    tiers[k].students.sort((a, b) => {
      if (a.isBubble !== b.isBubble) return a.isBubble ? -1 : 1;
      const scoreA = a.activeTest?.scaledScore || 0;
      const scoreB = b.activeTest?.scaledScore || 0;
      return scoreA - scoreB;
    });
  }

  return tiers;
}

/**
 * Generates copyable, structured prompts tailored to a student for NotebookLM workflows
 */
export function generateNotebookLMPrompt(student, workflowType = 'IEP') {
  const flags = [];
  if (student.flags?.sped) flags.push("Special Education (IEP)");
  if (student.flags?.plan504) flags.push("Section 504 Plan");
  if (student.flags?.elStatus) flags.push(`English Learner (${student.flags.elStatus})`);
  if (student.flags?.homelessFoster) flags.push("Foster/Homeless Student");
  const flagStr = flags.length > 0 ? flags.join(", ") : "General Education";

  const elaHist = (student.elaHistory || []).map(h => 
    `  - Grade ${h.testGrade} (${h.dateTaken || h.year}): Scaled Score ${h.scaledScore}, Level ${h.performanceLevel}`
  ).join("\n") || "  - No historical ELA records";

  const mathHist = (student.mathHistory || []).map(h => 
    `  - Grade ${h.testGrade} (${h.dateTaken || h.year}): Scaled Score ${h.scaledScore}, Level ${h.performanceLevel}`
  ).join("\n") || "  - No historical Math records";

  const elaDelta = student.elaDelta !== null ? `${student.elaDelta > 0 ? '+' : ''}${student.elaDelta} pts` : 'N/A';
  const mathDelta = student.mathDelta !== null ? `${student.mathDelta > 0 ? '+' : ''}${student.mathDelta} pts` : 'N/A';

  if (workflowType === 'IEP') {
    return `### California IEP / 504 Accommodations Assistant (NotebookLM Prompt)
Student: ${student.name} (ID: ${student.studentId})
School: ${student.school} | Current Grade: ${student.grade}
Designated Support Staff: ${student.staffLabel} ${student.staffName}
Program Classifications: ${flagStr}

**SBAC Longitudinal Trajectory:**
ELA Latest: ${student.latestEla?.scaledScore || 'N/A'} (Level ${student.latestEla?.performanceLevel || 'N/A'}), YoY Change: ${elaDelta}
Math Latest: ${student.latestMath?.scaledScore || 'N/A'} (Level ${student.latestMath?.performanceLevel || 'N/A'}), YoY Change: ${mathDelta}

**Longitudinal Assessment Record:**
ELA History:
${elaHist}

Math History:
${mathHist}

**Instructions for NotebookLM:**
Act as an expert Special Education Specialist and School Psychologist for Walnut Valley Unified. Based on this student's longitudinal SBAC scale score trajectory, growth deltas, and demographic profile:
1. Identify the student's primary academic risk factors and relative strengths across ELA and Mathematics claims.
2. Recommend 3 specific, measurable SMART IEP/504 academic goals targeting scale score recovery.
3. Suggest 4 evidence-based classroom and testing accommodations (e.g., text-to-speech, chunking, graphic organizers, visual aids) appropriate for CAASPP testing and daily instruction.
4. Draft a concise 1-paragraph summary suitable for inclusion in the Present Levels of Academic Achievement and Functional Performance (PLAAFP) section.`;
  }

  if (workflowType === 'SST') {
    return `### Student Study Team (SST) Multi-Tiered Intervention Plan (NotebookLM Prompt)
Student: ${student.name} (ID: ${student.studentId})
School: ${student.school} | Grade: ${student.grade}
Teacher / Counselor: ${student.staffLabel} ${student.staffName}
Student Profile: ${flagStr}

**Assessment Baseline:**
- ELA Scaled Score: ${student.latestEla?.scaledScore || 'N/A'} (Level ${student.latestEla?.performanceLevel || 'N/A'}), YoY Delta: ${elaDelta}
- Math Scaled Score: ${student.latestMath?.scaledScore || 'N/A'} (Level ${student.latestMath?.performanceLevel || 'N/A'}), YoY Delta: ${mathDelta}

**SBAC Longitudinal Trends:**
ELA:
${elaHist}

Math:
${mathHist}

**Instructions for NotebookLM:**
Act as a Walnut Valley Unified Multi-Tiered System of Support (MTSS) Intervention Specialist. Formulate an individualized SST Action Plan:
1. Determine whether the student qualifies for Tier 2 Strategic Intervention or Tier 3 Intensive Academic Support.
2. Outline a 6-to-8 week targeted intervention protocol with specific progress-monitoring checkpoints.
3. Provide recommended parent-teacher partnership strategies and home learning supports.
4. Formulate 2 benchmark targets for the next district progress check.`;
  }

  // Tiered Lesson Architect
  return `### Tiered Lesson Differentiation Architect (NotebookLM Prompt)
Student: ${student.name} (Grade ${student.grade}) | School: ${student.school}
Current SBAC Tier: ELA Level ${student.latestEla?.performanceLevel || 'N/A'} | Math Level ${student.latestMath?.performanceLevel || 'N/A'}
Growth Velocity: ELA (${elaDelta}), Math (${mathDelta})
Demographics: ${flagStr}

**Instructions for NotebookLM:**
Act as an expert Instructional Coach. Using Universal Design for Learning (UDL) principles:
1. Provide tiered scaffolded supports and sentence frames appropriate for this student's current proficiency level.
2. Provide tiered questioning prompts (DOK Level 1 through DOK Level 3) calibrated to their scale score bracket.
3. Suggest multi-modal representation strategies (visual, kinesthetic, peer collaborative) to accelerate mastery.`;
}
