// src/App.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID, APPS_SCRIPT_URL, DISTRICT_LOGO, isBubbleStudent } from './config.js';
import {
  saveUserSession,
  saveCachedStudents,
  getCachedStudents,
  clearUserSession,
  getStoredSession
} from './utils/authStorage.js';
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
  // Synchronously verify if an active session exists in memory/sessionStorage:
  // If not in sessionStorage, immediately force Google Sign-In prompt without delay or auto-fetching
  const [user, setUser] = useState(() => {
    const session = getStoredSession();
    return session?.user || null;
  });

  const [isAuthResolving, setIsAuthResolving] = useState(() => {
    const session = getStoredSession();
    return Boolean(session && session.email);
  });
  const [students, setStudents] = useState([]);
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

  // Helper to parse and apply bookmark URL query parameters
  const applyUrlBookmarkParams = useCallback((studentList = []) => {
    if (typeof window === 'undefined' || !window.location.search) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const siteParam = params.get('site');
      const gradeParam = params.get('grade');
      const staffParam = params.get('staff');
      const bandParam = params.get('band') || params.get('gradeBand');
      const viewParam = params.get('view');
      const flagParam = params.get('flag');

      if (siteParam && siteParam !== 'ALL') {
        setSelectedSite(siteParam);
      }
      if (bandParam && ['Elementary', 'Middle', 'High'].includes(bandParam)) {
        setGradeBand(bandParam);
      }
      if (gradeParam && gradeParam !== 'ALL') {
        setSelectedGrade(gradeParam);
      }
      if (staffParam && staffParam !== 'ALL') {
        setSelectedStaff(staffParam);
        const cleanTarget = staffParam.toLowerCase().trim();
        const matched = (Array.isArray(studentList) ? studentList : []).find(s => {
          if (!s) return false;
          const sName = (s.staffName || '').toLowerCase().trim();
          const sEmail = (s.staffEmail || '').toLowerCase().trim();
          return sName === cleanTarget || sEmail === cleanTarget || sName.includes(cleanTarget);
        });
        if (matched) {
          setActiveStaffFilter({
            staffName: matched.staffName,
            staffEmail: matched.staffEmail,
            school: matched.school,
            grade: matched.grade,
            gradeBand: matched.gradeBand
          });
        }
      }
      if (viewParam && (viewParam === 'overview' || viewParam === 'roster')) {
        setActiveView(viewParam);
      }
      if (flagParam && ['SPED', 'EL', '504', 'BUBBLE'].includes(flagParam)) {
        setActiveFlagFilter(flagParam);
      }
    } catch (e) {
      console.warn('Error applying URL bookmark params:', e);
    }
  }, []);

  // Helper to determine the appropriate initial grade band, site, and teacher roster from the user
  const autoConfigureUserContext = useCallback((currentUser, studentList = []) => {
    if (!currentUser) return;

    if (currentUser.school && currentUser.school !== 'ALL') {
      setSelectedSite(currentUser.school);
      const schoolStudents = studentList.filter(s => s && s.school === currentUser.school);
      const bands = [...new Set(schoolStudents.map(s => s?.gradeBand).filter(Boolean))];
      if (bands.length > 0) {
        setGradeBand(bands[0]);
      }
    } else {
      setSelectedSite('ALL');
    }

    if (currentUser.role === 'ElementaryTeacher' || currentUser.role === 'SecondaryTeacher') {
      const userEmail = (currentUser.email || '').toLowerCase().trim();
      const userName = (currentUser.name || '').toLowerCase().trim();

      const matched = (studentList || []).find(s => {
        if (!s) return false;
        const sEmail = (s.staffEmail || '').toLowerCase().trim();
        const sName = (s.staffName || '').toLowerCase().trim();
        return (userEmail && sEmail && userEmail === sEmail) ||
               (userName && sName && (sName === userName || userName.includes(sName) || sName.includes(userName)));
      });

      if (matched) {
        setActiveStaffFilter({
          staffName: matched.staffName,
          staffEmail: matched.staffEmail || userEmail,
          school: matched.school || currentUser.school,
          grade: matched.grade,
          gradeBand: matched.gradeBand || (currentUser.role === 'ElementaryTeacher' ? 'Elementary' : 'High')
        });
        setSelectedStaff(matched.staffName);
        if (matched.gradeBand) setGradeBand(matched.gradeBand);
        if (matched.school) setSelectedSite(matched.school);
      }
      setActiveView('roster');
    } else if (currentUser.role === 'Counselor') {
      const bands = [...new Set((studentList || []).map(s => s?.gradeBand).filter(Boolean))];
      if (bands.includes('High')) setGradeBand('High');
      else if (bands.includes('Middle')) setGradeBand('Middle');
      setActiveView('overview');
    } else {
      setActiveView('overview');
    }
  }, []);

  // Fetch payload from Apps Script Web App
  const fetchDashboardData = useCallback(async (userEmail, fallbackName = '', isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true);
    }
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

      const fetchedStudents = Array.isArray(data.students) ? data.students : [];

      setUser(verifiedUser);
      setStudents(fetchedStudents);

      // Persist session across storage & cookies
      saveUserSession(verifiedUser);
      saveCachedStudents(fetchedStudents);

      // Auto-configure initial view based on user role and school
      autoConfigureUserContext(verifiedUser, fetchedStudents);

      // Apply URL bookmark parameters if any
      applyUrlBookmarkParams(fetchedStudents);

      return { user: verifiedUser, students: fetchedStudents };

    } catch (err) {
      console.error('Data fetch error:', err);
      if (err.message && err.message.toLowerCase().includes('not authorized')) {
        clearUserSession();
        setUser(null);
        setStudents([]);
      }
      setAuthError(err.message || 'Unable to load dashboard data. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
      setIsAuthResolving(false);
    }
  }, [autoConfigureUserContext, applyUrlBookmarkParams]);

  // Direct load & mount: restore Google session or user token from localStorage, sessionStorage, or cookie
  useEffect(() => {
    let isMounted = true;

    const restoreSessionOnMount = async () => {
      const stored = getStoredSession();

      if (!stored || !stored.email) {
        // No active session in memory/sessionStorage - force clean Google Sign-In prompt immediately
        if (isMounted) {
          setIsAuthResolving(false);
          setUser(null);
        }
        return;
      }

      setIsAuthResolving(true);
      try {

        // Check for cached students from previous session
        const cached = getCachedStudents();

        if (cached && cached.length > 0 && stored.user) {
          // Instant restoration from cache for fast direct bookmark access
          if (isMounted) {
            setUser(stored.user);
            setStudents(cached);
            autoConfigureUserContext(stored.user, cached);
            applyUrlBookmarkParams(cached);
            setIsAuthResolving(false);
          }

          // Background sync to ensure fresh assessment scores
          try {
            await fetchDashboardData(stored.email, stored.name, true);
          } catch (syncErr) {
            console.warn('Background sync using cached data:', syncErr);
          }
        } else {
          // No cached students in storage (or direct link accessing uncached state):
          // Guard rendering and fetch full data with loading spinner before rendering cards
          if (isMounted) {
            setIsLoading(true);
          }
          await fetchDashboardData(stored.email, stored.name, false);
        }
      } catch (err) {
        console.error('Session restoration error:', err);
        if (isMounted) {
          setIsAuthResolving(false);
          setIsLoading(false);
        }
      }
    };

    restoreSessionOnMount();

    return () => {
      isMounted = false;
    };
  }, [autoConfigureUserContext, applyUrlBookmarkParams, fetchDashboardData]);

  // Synchronize active filters to URL query string for bookmarks
  useEffect(() => {
    if (typeof window === 'undefined' || isAuthResolving || !user) return;
    try {
      const params = new URLSearchParams();
      if (selectedSite && selectedSite !== 'ALL') params.set('site', selectedSite);
      if (gradeBand) params.set('band', gradeBand);
      if (selectedGrade && selectedGrade !== 'ALL') params.set('grade', selectedGrade);
      if (selectedStaff && selectedStaff !== 'ALL') params.set('staff', selectedStaff);
      if (activeView && activeView !== 'overview') params.set('view', activeView);
      if (activeFlagFilter) params.set('flag', activeFlagFilter);

      const qs = params.toString();
      const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
      window.history.replaceState(null, '', newUrl);
    } catch {
      // ignore
    }
  }, [user, isAuthResolving, selectedSite, gradeBand, selectedGrade, selectedStaff, activeView, activeFlagFilter]);

  // Handle Logout
  const handleLogout = () => {
    setUser(null);
    setStudents([]);
    setSelectedSite('ALL');
    setSelectedGrade('ALL');
    setSelectedStaff('ALL');
    setActiveStaffFilter(null);
    setActiveFlagFilter(null);
    clearUserSession();
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // Fast Demo Switcher for Evaluation and Presentation
  const handleDemoLogin = (demoEmail, demoName) => {
    fetchDashboardData(demoEmail, demoName, false);
  };

  // Switch demo perspective dynamically when logged in as SuperAdmin
  const handleSwitchDemoRole = (roleType) => {
    switch (roleType) {
      case 'SuperAdmin':
        fetchDashboardData('kwendland@wvusd.org', 'Super Admin', false);
        break;
      case 'HighSchoolCounselor':
        fetchDashboardData('sburns@wvusd.org', 'Burns, S', false);
        break;
      case 'MiddleSchoolCounselor':
        fetchDashboardData('jochen@wvusd.org', 'Chen, J', false);
        break;
      case 'ElementaryTeacher':
        fetchDashboardData('jurbaniec@wvusd.org', 'Urbaniec, Julie', false);
        break;
      case 'SecondaryTeacher':
        fetchDashboardData('cschultz@wvusd.org', 'Schultz, Corolar', false);
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

  // Compute available grades for current parameters (strictly 4 and 5 for Elementary)
  const availableGrades = useMemo(() => {
    let pool = Array.isArray(students) ? students : [];
    if (selectedSite !== 'ALL') pool = pool.filter(s => s && s.school === selectedSite);
    pool = pool.filter(s => s && s.gradeBand === gradeBand);

    if (gradeBand === 'Elementary') {
      // Restrict strictly to Grades 4 and 5 (exclude Grade 3 as well as Grades 1 and 2)
      return [4, 5];
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

  // Compute available teachers / staff for current filters (strictly 4 and 5 for Elementary)
  const staffList = useMemo(() => {
    let pool = Array.isArray(students) ? students : [];
    if (selectedSite !== 'ALL') {
      pool = pool.filter(s => s && s.school === selectedSite);
    }
    pool = pool.filter(s => s && s.gradeBand === gradeBand);
    if (gradeBand === 'Elementary') {
      pool = pool.filter(s => s && Number(s.grade) >= 4 && Number(s.grade) <= 5);
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

    // Strictly Grades 4 and 5 for Elementary (exclude Grade 3 entirely)
    if (gradeBand === 'Elementary') {
      list = list.filter(s => s && Number(s.grade) >= 4 && Number(s.grade) <= 5);
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

  // Explicitly scroll window to top whenever switching to roster view (prevents scroll jump)
  useEffect(() => {
    if (typeof window !== 'undefined' && activeView === 'roster') {
      window.scrollTo(0, 0);
    }
  }, [activeView]);

  // Drilldown handler for an entire grade cohort
  const handleSelectGradeRoster = (gradeNum) => {
    setSelectedGrade(String(gradeNum));
    setActiveStaffFilter(null);
    setSelectedStaff('ALL');
    setActiveView('roster');
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
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
      if (g >= 4 && g <= 5) setGradeBand('Elementary');
      else if (g >= 6 && g <= 8) setGradeBand('Middle');
      else if (g >= 9 && g <= 12) setGradeBand('High');
    }

    // Reset specific grade filter if the clicked staff member's grade differs
    if (selectedGrade !== 'ALL' && staffRow.grade && Number(selectedGrade) !== Number(staffRow.grade)) {
      setSelectedGrade('ALL');
    }

    setActiveView('roster');
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  };

  // Reset staff filter & view back to Executive Overview
  const handleClearStaffFilter = () => {
    setActiveStaffFilter(null);
    setSelectedStaff('ALL');
    setActiveView('overview');
  };

  // 1. Guard initial auth resolution & data loading for direct-link bookmarks:
  // If user state is still resolving, or if user is set but students dataset is still fetching (preventing all-zeros bug)
  if (isAuthResolving || (isLoading && students.length === 0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center items-center p-4 text-slate-800">
        {/* Background Decorative Rings */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-indigo-500 blur-3xl" />
        </div>

        <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-8 text-center space-y-5 animate-fade-in backdrop-blur-md">
          <div className="w-20 h-20 mx-auto p-2.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-center">
            <img
              src={DISTRICT_LOGO}
              alt="Walnut Valley USD"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-blue-600 font-bold text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading WVUSD SBAC Portal...</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verifying Google credentials and synchronizing longitudinal assessment data...
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Secure District SSO Session</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. If user is unauthenticated after auth resolution, render the Login View
  if (!user) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <LoginView
          onLoginSuccess={(email, name) => fetchDashboardData(email, name, false)}
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

