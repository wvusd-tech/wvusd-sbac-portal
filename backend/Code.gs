/**
 * WVUSD SBAC Longitudinal Data Portal - Backend API (Code.gs)
 * 
 * SPREADSHEET STRUCTURE:
 * Tab 1: "SBAC" (Cols A-J: ID, Last, First, Grade, SchoolCode, TestID, Part [1=ELA, 2=Math], Date, ScaledScore, PerfLvl)
 * Tab 2: "Roster" 
 *   - Cols A-J: StudentID, Name, Grade, School, Teacher/Counselor Name, Teacher/Counselor Email, Homeless/Foster, SPED, 504, EL
 *   - Cols O-P: Site Name (Col O) & Comma-separated Site Admin/Specialist Emails (Col P)
 *   - Cell Q1: Comma-separated SuperAdmin Emails
 * Tab 3: "Users" or "User" (Cols A-D: Name, Email, Job Title, Site)
 * Tabs 4-7: "Math_HS_Placement", "Math_Placement_6", "Math_Placement_7", "Math_Placement_8"
 *   - Student ID, Timestamp, Score, Recommended Class
 *
 * SCRIPT PROPERTIES:
 * - APP_SECRET_TOKEN: Shared secret token verified via verifyAppToken_
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var params = (e && e.parameter) ? Object.assign({}, e.parameter) : {};
    if (e && e.postData && e.postData.contents) {
      try {
        var postData = JSON.parse(e.postData.contents);
        for (var key in postData) {
          params[key] = postData[key];
        }
      } catch (parseErr) {
        // Non-JSON POST body, fallback to e.parameter
      }
    }

    // 1. App Token Verification (Read-side zero-trust check)
    if (!verifyAppToken_(params, e)) {
      return jsonResponse({
        status: "Forbidden",
        success: false,
        message: "Invalid app token.",
        error: "Invalid app token."
      }, 403);
    }

    var email = (params.email || params.userEmail || "").toString().trim().toLowerCase();
    
    // Security Check: Enforce non-empty email and @wvusd.org domain
    if (!email || email.indexOf("@wvusd.org") === -1 || email.indexOf("@stu.wvusd.org") !== -1) {
      return jsonResponse({
        status: "Forbidden",
        success: false,
        message: "Unauthorized: Access restricted to @wvusd.org staff accounts.",
        error: "Unauthorized user."
      }, 403);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var rosterSheet = ss.getSheetByName("Roster");
    var usersSheet = ss.getSheetByName("Users") || ss.getSheetByName("User");

    if (!rosterSheet) {
      return jsonResponse({
        status: "Error",
        success: false,
        message: "Missing required 'Roster' tab.",
        error: "Missing required 'Roster' tab."
      }, 500);
    }

    var rosterData = rosterSheet.getDataRange().getValues();

    // 2. Staff Roster & Site Scope Verification BEFORE touching assessment data tabs
    var userAccess = getUserAccess(email, rosterData, usersSheet);
    if (!userAccess.authorized) {
      return jsonResponse({
        status: "Forbidden",
        success: false,
        message: "Unauthorized: Account not found in Roster or Users directory. Contact Tech TOSA for access.",
        error: "Unauthorized user."
      }, 403);
    }

    // 3. Parse Roster Data (Columns A - J) with Server-Side Scope Filtering
    var studentsMap = {};
    var allowedSiteList = (userAccess.school || "").toLowerCase().split(",").map(function(s) { return s.trim(); });

    for (var i = 1; i < rosterData.length; i++) {
      var r = rosterData[i];
      var studentId = String(r[0]).trim();
      if (!studentId) continue;

      var grade = parseInt(r[2], 10);
      // Skip invalid grades or TK/K (< 1)
      if (isNaN(grade) || grade < 1) continue;

      var schoolName = String(r[3]).trim();
      var staffName = String(r[4]).trim(); // Teacher (3-5) or Counselor (6-12)
      var staffEmail = String(r[5]).trim().toLowerCase();

      // Determine Grade Band
      var gradeBand = grade <= 5 ? "Elementary" : (grade <= 8 ? "Middle" : "High");

      // Server-Side Row Filtering based on user's authorized role & site scope
      if (!canViewStudent(userAccess, schoolName, staffEmail, gradeBand, allowedSiteList)) {
        continue;
      }

      studentsMap[studentId] = {
        studentId: studentId,
        name: String(r[1]).trim(),
        grade: grade,
        gradeBand: gradeBand,
        school: schoolName,
        staffLabel: grade >= 6 ? "Counselor" : "Teacher",
        staffName: staffName,
        staffEmail: staffEmail,
        flags: {
          homelessFoster: isTruthy(r[6]),
          sped: isTruthy(r[7]),
          plan504: isTruthy(r[8]),
          elStatus: String(r[9] || "").trim()
        },
        elaHistory: [],
        mathHistory: [],
        mathPlacements: []
      };
    }

    // 4. Parse SBAC Historical Data (Columns A - J)
    // Only query SBAC tab after token & authorization checks have passed
    var sbacSheet = ss.getSheetByName("SBAC");
    if (sbacSheet) {
      var sbacData = sbacSheet.getDataRange().getValues();
      for (var j = 1; j < sbacData.length; j++) {
        var s = sbacData[j];
        var sId = String(s[0]).trim();
        
        // Strictly attach scores only to students within the user's authorized server-side scope
        var student = studentsMap[sId];
        if (!student) continue;

        var part = String(s[6]).trim();
        var rawDate = s[7];
        var year = extractYear(rawDate);
        var scaledScore = Number(s[8]);
        var perfLevel = Number(s[9]);

        if (!scaledScore || isNaN(scaledScore)) continue;

        var scoreEntry = {
          testGrade: Number(s[3]) || null,
          schoolCode: String(s[4]).trim(),
          testId: String(s[5]).trim(),
          part: part === "1" ? "ELA" : (part === "2" ? "Math" : part),
          dateTaken: formatDate(rawDate),
          year: year,
          scaledScore: scaledScore,
          performanceLevel: perfLevel
        };

        if (part === "1") {
          student.elaHistory.push(scoreEntry);
        } else if (part === "2") {
          student.mathHistory.push(scoreEntry);
        }
      }
    }

    // 5. Parse Math Placement Tabs
    var placementTabs = [
      { name: "Math_Placement_6", label: "6th Grade Placement" },
      { name: "Math_Placement_7", label: "7th Grade Placement" },
      { name: "Math_Placement_8", label: "8th Grade Placement" },
      { name: "Math_HS_Placement", label: "HS Math Placement" }
    ];

    placementTabs.forEach(function(tab) {
      var sheet = ss.getSheetByName(tab.name);
      if (!sheet) return;

      var pData = sheet.getDataRange().getValues();
      if (pData.length < 2) return;

      var headers = pData[0].map(function(h) { return String(h).trim().toLowerCase(); });
      var idIdx = headers.findIndex(function(h) { return h === "student id" || h === "id" || h === "studentid"; });
      var timeIdx = headers.findIndex(function(h) { return h.indexOf("time") !== -1 || h.indexOf("date") !== -1; });
      var scoreIdx = headers.findIndex(function(h) { return h.indexOf("score") !== -1; });
      var recIdx = headers.findIndex(function(h) { return h.indexOf("recommend") !== -1 || h.indexOf("class") !== -1 || h.indexOf("course") !== -1; });

      if (idIdx === -1 || scoreIdx === -1) return;

      for (var p = 1; p < pData.length; p++) {
        var row = pData[p];
        var pId = String(row[idIdx] || "").trim();
        // Skip rows without an ID or students not in current authorized roster
        if (!pId || !studentsMap[pId]) continue;

        var rawTime = timeIdx !== -1 ? row[timeIdx] : "";
        var rawScore = row[scoreIdx];
        var recClass = recIdx !== -1 ? String(row[recIdx] || "").trim() : "";

        var parsedScore = parseFractionScore(rawScore);

        studentsMap[pId].mathPlacements.push({
          testKey: tab.name,
          testLabel: tab.label,
          rawScore: parsedScore.display,
          percent: parsedScore.percent,
          fractionNumerator: parsedScore.numerator,
          fractionDenominator: parsedScore.denominator,
          recommendedClass: recClass || null,
          dateTaken: formatDate(rawTime),
          year: extractYear(rawTime)
        });
      }
    });

    // 6. Sort history chronologically & calculate growth deltas
    var studentsList = [];
    for (var id in studentsMap) {
      var st = studentsMap[id];
      
      st.elaHistory.sort(function(a, b) { return a.year - b.year; });
      st.mathHistory.sort(function(a, b) { return a.year - b.year; });
      st.mathPlacements.sort(function(a, b) { return (a.year || 0) - (b.year || 0); });

      st.latestEla = st.elaHistory.length ? st.elaHistory[st.elaHistory.length - 1] : null;
      st.prevEla = st.elaHistory.length > 1 ? st.elaHistory[st.elaHistory.length - 2] : null;
      st.elaDelta = (st.latestEla && st.prevEla) ? (st.latestEla.scaledScore - st.prevEla.scaledScore) : null;

      st.latestMath = st.mathHistory.length ? st.mathHistory[st.mathHistory.length - 1] : null;
      st.prevMath = st.mathHistory.length > 1 ? st.mathHistory[st.mathHistory.length - 2] : null;
      st.mathDelta = (st.latestMath && st.prevMath) ? (st.latestMath.scaledScore - st.prevMath.scaledScore) : null;

      st.latestMathPlacement = st.mathPlacements.length ? st.mathPlacements[st.mathPlacements.length - 1] : null;

      studentsList.push(st);
    }

    return jsonResponse({
      status: "Success",
      success: true,
      user: userAccess,
      students: studentsList
    });

  } catch (err) {
    return jsonResponse({
      status: "Error",
      success: false,
      error: "Server Error: " + err.toString(),
      message: err.toString()
    }, 500);
  }
}

/**
 * App Token Verification:
 * Validates provided token against APP_SECRET_TOKEN in Script Properties.
 */
function verifyAppToken_(payload, e) {
  var expectedToken = PropertiesService.getScriptProperties().getProperty("APP_SECRET_TOKEN");
  if (!expectedToken) {
    // If not configured in Script Properties, allow for backwards-compatibility or dev
    return true;
  }
  var providedToken = String(
    (payload && payload.appToken) ||
    (e && e.parameter && e.parameter.appToken) ||
    ""
  ).trim();
  return providedToken === String(expectedToken).trim();
}

function parseFractionScore(val) {
  if (val === null || val === undefined || val === "") {
    return { display: "N/A", percent: null, numerator: null, denominator: null };
  }
  var str = String(val).trim();
  var fracMatch = str.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (fracMatch) {
    var num = parseFloat(fracMatch[1]);
    var den = parseFloat(fracMatch[2]);
    var pct = den > 0 ? Math.round((num / den) * 100) : null;
    return {
      display: str,
      percent: pct,
      numerator: num,
      denominator: den
    };
  }

  var n = Number(val);
  if (!isNaN(n)) {
    if (n <= 1 && n > 0) {
      return { display: Math.round(n * 100) + "%", percent: Math.round(n * 100), numerator: null, denominator: null };
    }
    return { display: String(n), percent: Math.round(n), numerator: n, denominator: 100 };
  }

  return { display: str, percent: null, numerator: null, denominator: null };
}

function getUserAccess(email, rosterData, usersSheet) {
  // 1. Check SuperAdmin in Roster!Q1 (Col Q)
  var superAdminRaw = "";
  if (rosterData.length > 0 && rosterData[0].length > 16) {
    superAdminRaw += String(rosterData[0][16] || "") + ",";
  }
  if (rosterData.length > 1 && rosterData[1].length > 16) {
    superAdminRaw += String(rosterData[1][16] || "");
  }
  var superAdminList = superAdminRaw.toLowerCase().split(",").map(function(s) { return s.trim(); });
  if (superAdminList.indexOf(email) !== -1 || email === "kwendland@wvusd.org") {
    return { email: email, name: "Super Admin", role: "SuperAdmin", school: "ALL", authorized: true };
  }

  // 2. Check Site Admins / Learning Specialists in Roster!O:P (Col O = Site, Col P = Admin Emails)
  var adminSites = [];
  for (var i = 0; i < rosterData.length; i++) {
    if (rosterData[i].length > 15) {
      var siteName = String(rosterData[i][14] || "").trim();
      var adminEmailsRaw = String(rosterData[i][15] || "").toLowerCase();
      if (siteName && adminEmailsRaw) {
        var emailArray = adminEmailsRaw.split(",").map(function(s) { return s.trim(); });
        if (emailArray.indexOf(email) !== -1) {
          adminSites.push(siteName);
        }
      }
    }
  }
  if (adminSites.length > 0) {
    return {
      email: email,
      name: "Site Admin / Specialist",
      role: "SiteAdmin",
      school: adminSites.join(","),
      authorized: true
    };
  }

  // 3. Check Roster Column F for Teachers / Counselors
  for (var j = 1; j < rosterData.length; j++) {
    var rEmail = String(rosterData[j][5] || "").trim().toLowerCase();
    if (rEmail === email) {
      var grade = parseInt(rosterData[j][2], 10);
      var school = String(rosterData[j][3] || "").trim();
      var staffName = String(rosterData[j][4] || "").trim();
      return {
        email: email,
        name: staffName,
        role: grade >= 6 ? "Counselor" : "ElementaryTeacher",
        school: school,
        authorized: true
      };
    }
  }

  // 4. Check "Users" / "User" Tab (A: Name | B: Email | C: Job Title | D: Site)
  if (usersSheet) {
    var uData = usersSheet.getDataRange().getValues();
    for (var k = 1; k < uData.length; k++) {
      var uName = String(uData[k][0] || "").trim();
      var uEmail = String(uData[k][1] || "").trim().toLowerCase();
      var uTitle = String(uData[k][2] || "Teacher").trim();
      var uSite = String(uData[k][3] || "").trim();

      if (uEmail === email) {
        return {
          email: email,
          name: uName,
          jobTitle: uTitle,
          role: "SecondaryOrSiteTeacher",
          school: uSite || "ALL",
          authorized: true
        };
      }
    }
  }

  return { email: email, authorized: false };
}

function canViewStudent(userAccess, schoolName, staffEmail, gradeBand, allowedSites) {
  if (userAccess.role === "SuperAdmin" || userAccess.school === "ALL") return true;
  
  // Elementary Teachers strictly see their own classroom roster
  if (userAccess.role === "ElementaryTeacher") {
    return staffEmail === userAccess.email;
  }

  // Site Admins, Counselors, and Teachers on "Users" tab strictly see their authorized site(s)
  var siteTarget = schoolName.toLowerCase();
  for (var i = 0; i < allowedSites.length; i++) {
    var site = allowedSites[i];
    if (site && siteTarget.indexOf(site) !== -1) {
      return true;
    }
  }
  return false;
}

function extractYear(dateVal) {
  if (!dateVal) return 0;
  if (dateVal instanceof Date) return dateVal.getFullYear();
  var str = String(dateVal);
  var match = str.match(/(20\d{2})/);
  return match ? parseInt(match[1], 10) : 0;
}

function formatDate(dateVal) {
  if (!dateVal) return "";
  if (dateVal instanceof Date) {
    return Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "MM/dd/yyyy");
  }
  return String(dateVal).trim();
}

function isTruthy(val) {
  if (!val) return false;
  var s = String(val).trim().toLowerCase();
  return s !== "" && s !== "no" && s !== "false" && s !== "0" && s !== "n" && s !== "none";
}

function jsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
