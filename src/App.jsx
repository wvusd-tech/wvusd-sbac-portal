// src/App.jsx
import React, { useState, useMemo } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID, APPS_SCRIPT_URL, isBubbleStudent } from './config.js';
import HeaderBar from './components/HeaderBar.jsx';
import ControlBar from './components/ControlBar.jsx';
import ExecutiveOverview from './components/ExecutiveOverview.jsx';
import TeacherCohortView from './components/TeacherCohortView.jsx';
import StudentModal from './components/StudentModal.jsx';
import LoginView from './components/LoginView.jsx';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';

class ViewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ViewErrorBoundary caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white border border-rose-200 rounded-2xl p-8 max-w-lg mx-auto text-center my-12 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Unable to Display Roster View
          </h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">
            {this.state.error?.message || 'An unexpected rendering error occurred while loading this view.'}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onReset?.();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Executive Overview</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Session & Authentication
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('wvusd_sbac_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [students, setStudents] = useState(() => {
    try {
      const saved = localStorage.getItem('wvusd_sbac_students');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // App Navigation & Filters
  const [gradeBand, setGradeBand] = useState('Elementary'); // 'Elementary' | 'Middle' | 'High'
  const [subjectFocus, setSubjectFocus] = useState('ALL'); // 'ALL' | 'ELA' | 'MATH'
  const [selectedSite, setSelectedSite] = useState('ALL');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [selectedStaff, setSelectedStaff] = useState('ALL');
  const [activeStaffFilter, setActiveStaffFilter] = useState(null);
  const [activeFlagFilter, setActiveFlagFilter] = useState(null); // 'SPED' | 'EL' | '504' | 'BUBBLE' | null
  const [activeView, setActiveView] = useState('overview'); // 'overview' | 'roster'
  const [activeModalStudent, setActiveModalStudent] = useState(null);
  const [levelQuickFilter, setLevelQuickFilter] = useState(null);

  // Fetch payload from Apps Script Web App
  const fetchDashboardData = async (userEmail, fallbackName = '') => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?email=${encodeURIComponent(userEmail)}`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.user || !data.user.authorized) {
        throw new Error('User is not authorized to access this portal.');
      }

      const verifiedUser = {
        ...data.user,
        name: data.user.name || fallbackName || userEmail.split('@')[0]
      };

      setUser(verifiedUser);
      setStudents(data.students || []);

      // Cache locally for offline resiliency and fast subsequent page loads
      localStorage.setItem('wvusd_sbac_user', JSON.stringify(verifiedUser));
      try {
        localStorage.setItem('wvusd_sbac_students', JSON.stringify(data.students || []));
      } catch {
        console.warn('LocalStorage quota exceeded for full student dataset');
      }

      // Auto-configure initial view based on user role and school
      autoConfigureUserContext(verifiedUser, data.students || []);

    } catch (err) {
      console.error('Data fetch error:', err);
      setAuthError(err.message || 'Unable to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to determine the appropriate initial grade band and site from the user
  const autoConfigureUserContext = (currentUser, studentList) => {
    if (!currentUser) return;

    if (currentUser.school && currentUser.school !== 'ALL') {
      setSelectedSite(currentUser.school);
      const schoolStudents = studentList.filter(s => s.school === currentUser.school);
      const bands = [...new Set(schoolStudents.map(s => s.gradeBand).filter(Boolean))];
      if (bands.length > 0) {
        setGradeBand(bands[0]);
      }
    } else {
      setSelectedSite('ALL');
      if (currentUser.role === 'ElementaryTeacher') {
        setGradeBand('Elementary');
        setActiveView('roster');
      } else if (currentUser.role === 'Counselor') {
        const bands = [...new Set(studentList.map(s => s.gradeBand).filter(Boolean))];
        if (bands.includes('High')) setGradeBand('High');
        else if (bands.includes('Middle')) setGradeBand('Middle');
      }
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setUser(null);
    setStudents([]);
    localStorage.removeItem('wvusd_sbac_user');
    localStorage.removeItem('wvusd_sbac_students');
  };

  // Fast Demo Switcher for Evaluation and Presentation
  const handleDemoLogin = (demoEmail, demoName) => {
    fetchDashboardData(demoEmail, demoName);
  };

  // Switch demo perspective dynamically when logged in as SuperAdmin
  const handleSwitchDemoRole = (roleType) => {
    switch (roleType) {
      case 'SuperAdmin':
        fetchDashboardData('kwendland@wvusd.org', 'Super Admin');
        break;
      case 'HighSchoolCounselor':
        fetchDashboardData('sburns@wvusd.org', 'Burns, S');
        break;
      case 'MiddleSchoolCounselor':
        fetchDashboardData('jochen@wvusd.org', 'Chen, J');
        break;
      case 'ElementaryTeacher':
        fetchDashboardData('jurbaniec@wvusd.org', 'Urbaniec, Julie');
        break;
      case 'SecondaryTeacher':
        fetchDashboardData('cschultz@wvusd.org', 'Schultz, Corolar');
        break;
      default:
        break;
    }
  };

  // List of all school sites present in the loaded dataset
  const sitesList = useMemo(() => {
    const set = new Set();
    students.forEach(s => {
      if (s.school && s.school.trim()) set.add(s.school.trim());
    });
    return [...set].sort();
  }, [students]);

  // List of grade bands present in current site
  const availableGradeBands = useMemo(() => {
    let pool = students;
    if (selectedSite !== 'ALL') {
      pool = pool.filter(s => s.school === selectedSite);
    }
    const bands = new Set(pool.map(s => s.gradeBand).filter(Boolean));
    return ['Elementary', 'Middle', 'High'].filter(b => bands.has(b));
  }, [students, selectedSite]);

  // Handle School Site change
  const handleSiteChange = (site) => {
    setSelectedSite(site);
    setSelectedGrade('ALL');
    setSelectedStaff('ALL');
    setActiveStaffFilter(null);
    setActiveFlagFilter(null);

    // Auto-align grade band to new school
    if (site !== 'ALL') {
      const siteStudents = students.filter(s => s.school === site);
      const siteBands = [...new Set(siteStudents.map(s => s.gradeBand).filter(Boolean))];
      if (siteBands.length === 1) {
        setGradeBand(siteBands[0]);
      } else if (!siteBands.includes(gradeBand) && siteBands.length > 0) {
        setGradeBand(siteBands[0]);
      }
    }
  };

  // Handle Grade Band Change
  const handleGradeBandChange = (newBand) => {
    setGradeBand(newBand);
    setSelectedGrade('ALL');
    setSelectedStaff('ALL');
    setActiveStaffFilter(null);
    setActiveFlagFilter(null);
  };

  // Compute available grades for current parameters (strictly 3, 4, 5 for Elementary)
  const availableGrades = useMemo(() => {
    let pool = Array.isArray(students) ? students : [];
    if (selectedSite !== 'ALL') pool = pool.filter(s => s && s.school === selectedSite);
    pool = pool.filter(s => s && s.gradeBand === gradeBand);

    if (gradeBand === 'Elementary') {
      // Restrict strictly to Grades 3, 4, and 5 (exclude Grades 1 and 2 entirely)
      return [3, 4, 5];
    }

    const gradesSet = new Set(pool.map(s => s.grade).filter(Boolean));
    return [...gradesSet].sort((a, b) => a - b);
  }, [students, selectedSite, gradeBand]);

  // Handle Grade Change
  const handleGradeChange = (gradeVal) => {
    setSelectedGrade(gradeVal);
    setSelectedStaff('ALL');
    setActiveStaffFilter(null);
  };

  // Compute available teachers / staff for current filters (strictly 3, 4, 5 for Elementary)
  const staffList = useMemo(() => {
    let pool = Array.isArray(students) ? students : [];
    if (selectedSite !== 'ALL') {
      pool = pool.filter(s => s && s.school === selectedSite);
    }
    pool = pool.filter(s => s && s.gradeBand === gradeBand);
    if (gradeBand === 'Elementary') {
      pool = pool.filter(s => s && Number(s.grade) >= 3 && Number(s.grade) <= 5);
    }
    if (selectedGrade !== 'ALL') {
      pool = pool.filter(s => s && s.grade === Number(selectedGrade));
    }

    const map = new Map();
    pool.forEach(s => {
      if (s && s.staffName) {
        const name = s.staffName.trim();
        if (!map.has(name)) {
          map.set(name, {
            staffName: name,
            staffEmail: s.staffEmail || '',
            staffLabel: s.staffLabel || (gradeBand === 'Elementary' ? 'Teacher' : 'Counselor'),
            school: s.school || '',
            grade: s.grade || '',
            gradeBand: s.gradeBand || gradeBand
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.staffName.localeCompare(b.staffName));
  }, [students, selectedSite, gradeBand, selectedGrade]);

  // Handle Teacher / Staff top dropdown change
  const handleStaffChange = (staffVal) => {
    setSelectedStaff(staffVal);
    if (!staffVal || staffVal === 'ALL') {
      setActiveStaffFilter(null);
    } else {
      const match = staffList.find(st => st.staffName === staffVal);
      setActiveStaffFilter(match || { staffName: staffVal });
    }
  };

  // Base cohort students for current site and gradeBand (before flag or staff filter)
  const cohortStudents = useMemo(() => {
    let list = Array.isArray(students) ? students.filter(Boolean) : [];

    // Filter by school site
    if (selectedSite !== 'ALL') {
      list = list.filter(s => s && s.school === selectedSite);
    }

    // Filter by grade band
    list = list.filter(s => s && s.gradeBand === gradeBand);

    // Strictly Grades 3, 4, 5 for Elementary (exclude Grades 1 and 2 entirely)
    if (gradeBand === 'Elementary') {
      list = list.filter(s => s && Number(s.grade) >= 3 && Number(s.grade) <= 5);
    }

    // Filter by specific grade if selected
    if (selectedGrade !== 'ALL') {
      list = list.filter(s => s && s.grade === Number(selectedGrade));
    }

    return list;
  }, [students, selectedSite, gradeBand, selectedGrade]);

  // Filtered students for current top-level parameters + active flag filters
  const filteredStudents = useMemo(() => {
    let list = cohortStudents;

    // Filter by Demographic & Support Flag if active
    if (activeFlagFilter) {
      if (activeFlagFilter === 'SPED') {
        list = list.filter(s => Boolean(s.flags?.sped));
      } else if (activeFlagFilter === 'EL') {
        list = list.filter(s => Boolean(s.flags?.elStatus && s.flags.elStatus !== 'EO' && s.flags.elStatus.trim().length > 0));
      } else if (activeFlagFilter === '504') {
        list = list.filter(s => Boolean(s.flags?.plan504));
      } else if (activeFlagFilter === 'BUBBLE') {
        list = list.filter(s => {
          const elaBubble = s.latestEla?.scaledScore ? isBubbleStudent(s.latestEla.scaledScore, s.grade, 'ELA') : (s.latestEla?.performanceLevel === 2);
          const mathBubble = s.latestMath?.scaledScore ? isBubbleStudent(s.latestMath.scaledScore, s.grade, 'Math') : (s.latestMath?.performanceLevel === 2);
          return elaBubble || mathBubble;
        });
      }
    }

    // Filter by staff if activeStaffFilter is set
    if (activeStaffFilter) {
      const targetEmail = (activeStaffFilter.staffEmail || '').toLowerCase().trim();
      const targetName = (activeStaffFilter.staffName || '').toLowerCase().trim();

      const matched = list.filter(s => {
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

      if (matched.length > 0) {
        list = matched;
      } else {
        // Fallback to broader match across students to prevent false blank page
        const broader = (Array.isArray(students) ? students : []).filter(s => {
          if (!s) return false;
          const sEmail = (s.staffEmail || '').toLowerCase().trim();
          const sName = (s.staffName || '').toLowerCase().trim();
          if (targetEmail && sEmail && targetEmail === sEmail) return true;
          if (targetName && sName && (targetName === sName || sName.includes(targetName) || targetName.includes(sName))) return true;
          return false;
        });
        list = broader;
      }
    }

    // Quick filter by Performance Level if clicked from Distribution Bar (overview only)
    if (levelQuickFilter && activeView === 'overview') {
      list = list.filter(s => {
        if (!s) return false;
        if (subjectFocus === 'ELA') return s.latestEla?.performanceLevel === levelQuickFilter;
        if (subjectFocus === 'MATH') return s.latestMath?.performanceLevel === levelQuickFilter;
        return s.latestEla?.performanceLevel === levelQuickFilter || s.latestMath?.performanceLevel === levelQuickFilter;
      });
    }

    return list;
  }, [cohortStudents, activeFlagFilter, activeStaffFilter, levelQuickFilter, subjectFocus, activeView, students]);

  // Drilldown handler for an entire grade cohort
  const handleSelectGradeRoster = (gradeNum) => {
    setSelectedGrade(String(gradeNum));
    setActiveStaffFilter(null);
    setSelectedStaff('ALL');
    setActiveView('roster');
  };

  // Drilldown handler from breakdown table or teacher row click
  const handleSelectStaff = (staffRow) => {
    if (!staffRow) return;

    setActiveStaffFilter(staffRow);
    setSelectedStaff(staffRow.staffName || 'ALL');

    // Align gradeBand if needed so students aren't filtered out
    if (staffRow.gradeBand && ['Elementary', 'Middle', 'High'].includes(staffRow.gradeBand)) {
      setGradeBand(staffRow.gradeBand);
    } else if (staffRow.grade) {
      const g = Number(staffRow.grade);
      if (g >= 3 && g <= 5) setGradeBand('Elementary');
      else if (g >= 6 && g <= 8) setGradeBand('Middle');
      else if (g >= 9 && g <= 12) setGradeBand('High');
    }

    // Reset specific grade filter if the clicked staff member's grade differs
    if (selectedGrade !== 'ALL' && staffRow.grade && Number(selectedGrade) !== Number(staffRow.grade)) {
      setSelectedGrade('ALL');
    }

    setActiveView('roster');
  };

  // Reset staff filter & view back to Executive Overview
  const handleClearStaffFilter = () => {
    setActiveStaffFilter(null);
    setSelectedStaff('ALL');
    setActiveView('overview');
  };

  // If user is not logged in, render the Login View
  if (!user) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <LoginView
          onLoginSuccess={(email, name) => fetchDashboardData(email, name)}
          onDemoLogin={handleDemoLogin}
          isLoading={isLoading}
          authError={authError}
        />
      </GoogleOAuthProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
        
        {/* Global Header Bar */}
        <HeaderBar
          user={user}
          onLogout={handleLogout}
          selectedSite={selectedSite}
          students={students}
          onSearchSelect={(s) => setActiveModalStudent(s)}
          onSwitchDemoRole={user?.role === 'SuperAdmin' ? handleSwitchDemoRole : null}
        />

        {/* Executive Control Bar */}
        <ControlBar
          gradeBand={gradeBand}
          onGradeBandChange={handleGradeBandChange}
          availableGradeBands={availableGradeBands}
          subjectFocus={subjectFocus}
          onSubjectFocusChange={setSubjectFocus}
          sitesList={sitesList}
          selectedSite={selectedSite}
          onSiteChange={handleSiteChange}
          availableGrades={availableGrades}
          selectedGrade={selectedGrade}
          onGradeChange={handleGradeChange}
          staffList={staffList}
          selectedStaff={selectedStaff}
          onStaffChange={handleStaffChange}
          activeView={activeView}
          onViewChange={setActiveView}
          user={user}
        />

        {/* Main Content Area Wrapped with Crash-Proof Error Boundary */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-600">
                Synchronizing SBAC Longitudinal Assessments...
              </p>
            </div>
          ) : (
            <ViewErrorBoundary onReset={handleClearStaffFilter}>
              {activeView === 'overview' ? (
                <ExecutiveOverview
                  students={filteredStudents}
                  cohortStudents={cohortStudents}
                  gradeBand={gradeBand}
                  subjectFocus={subjectFocus}
                  onSelectStaff={handleSelectStaff}
                  onSelectGradeRoster={handleSelectGradeRoster}
                  onSelectLevelFilter={setLevelQuickFilter}
                  activeFlagFilter={activeFlagFilter}
                  onSelectFlagFilter={setActiveFlagFilter}
                />
              ) : (
                <TeacherCohortView
                  students={filteredStudents}
                  gradeBand={gradeBand}
                  subjectFocus={subjectFocus}
                  user={user}
                  onStudentClick={(s) => setActiveModalStudent(s)}
                  activeStaffFilter={activeStaffFilter}
                  onClearStaffFilter={handleClearStaffFilter}
                  onBackToOverview={() => setActiveView('overview')}
                />
              )}
            </ViewErrorBoundary>
          )}
        </main>

        {/* Longitudinal History & AI Prompt Modal */}
        {activeModalStudent && (
          <StudentModal
            student={activeModalStudent}
            onClose={() => setActiveModalStudent(null)}
          />
        )}

        {/* Portal Footer */}
        <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-500 no-print">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              Walnut Valley Unified School District • 880 S. Lemon Ave, Walnut, CA 91789
            </span>
            <span className="font-mono text-slate-400">
              CAASPP / SBAC Longitudinal Analytics Portal • v2.0
            </span>
          </div>
        </footer>

      </div>
    </GoogleOAuthProvider>
  );
}

