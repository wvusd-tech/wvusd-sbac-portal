// src/App.jsx
import React, { useState, useMemo } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID, APPS_SCRIPT_URL } from './config.js';
import HeaderBar from './components/HeaderBar.jsx';
import ControlBar from './components/ControlBar.jsx';
import ExecutiveOverview from './components/ExecutiveOverview.jsx';
import TeacherCohortView from './components/TeacherCohortView.jsx';
import StudentModal from './components/StudentModal.jsx';
import LoginView from './components/LoginView.jsx';
import { Loader2 } from 'lucide-react';

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
  const [activeView, setActiveView] = useState('overview'); // 'overview' | 'roster'
  const [activeModalStudent, setActiveModalStudent] = useState(null);
  const [activeStaffFilter, setActiveStaffFilter] = useState(null);
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
    setActiveStaffFilter(null);

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
    setActiveStaffFilter(null);
  };

  // Compute available grades for the current grade band
  const availableGrades = useMemo(() => {
    let pool = students;
    if (selectedSite !== 'ALL') pool = pool.filter(s => s.school === selectedSite);
    pool = pool.filter(s => s.gradeBand === gradeBand);

    const gradesSet = new Set(pool.map(s => s.grade).filter(Boolean));
    return [...gradesSet].sort((a, b) => a - b);
  }, [students, selectedSite, gradeBand]);

  // Filtered students for current top-level parameters
  const filteredStudents = useMemo(() => {
    let list = students;

    // Filter by school site
    if (selectedSite !== 'ALL') {
      list = list.filter(s => s.school === selectedSite);
    }

    // Filter by grade band
    list = list.filter(s => s.gradeBand === gradeBand);

    // Filter by specific grade
    if (selectedGrade !== 'ALL') {
      list = list.filter(s => s.grade === Number(selectedGrade));
    }

    // Filter by staff if selected
    if (activeStaffFilter) {
      list = list.filter(s => s.staffName === activeStaffFilter.staffName);
    }

    // Quick filter by Performance Level if clicked from Distribution Bar
    if (levelQuickFilter) {
      list = list.filter(s => {
        if (subjectFocus === 'ELA') return s.latestEla?.performanceLevel === levelQuickFilter;
        if (subjectFocus === 'MATH') return s.latestMath?.performanceLevel === levelQuickFilter;
        return s.latestEla?.performanceLevel === levelQuickFilter || s.latestMath?.performanceLevel === levelQuickFilter;
      });
    }

    return list;
  }, [students, selectedSite, gradeBand, selectedGrade, activeStaffFilter, levelQuickFilter, subjectFocus]);

  // Drilldown handler from breakdown table
  const handleSelectStaff = (staffRow) => {
    setActiveStaffFilter(staffRow);
    setActiveView('roster');
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
          onGradeChange={setSelectedGrade}
          activeView={activeView}
          onViewChange={setActiveView}
          user={user}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-600">
                Synchronizing SBAC Longitudinal Assessments...
              </p>
            </div>
          ) : (
            <div>
              {activeView === 'overview' ? (
                <ExecutiveOverview
                  students={filteredStudents}
                  gradeBand={gradeBand}
                  subjectFocus={subjectFocus}
                  onSelectStaff={handleSelectStaff}
                  onSelectLevelFilter={setLevelQuickFilter}
                />
              ) : (
                <TeacherCohortView
                  students={filteredStudents}
                  gradeBand={gradeBand}
                  subjectFocus={subjectFocus}
                  user={user}
                  onStudentClick={(s) => setActiveModalStudent(s)}
                  activeStaffFilter={activeStaffFilter}
                  onClearStaffFilter={() => setActiveStaffFilter(null)}
                />
              )}
            </div>
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
