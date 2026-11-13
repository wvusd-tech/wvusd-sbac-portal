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
 *   - Headers: ID Number (or Student ID), Timestamp, Score, Recommended Class
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
      var rawStudentId = r[0];
      var studentId = extractCleanStudentId_(rawStudentId);
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

    // 4. Parse SBAC Historical Data (Dynamic header detection & resilient parsing)
    // Only query SBAC tab after token & authorization checks have passed
    var sbacSheet = ss.getSheetByName("SBAC");
    if (sbacSheet) {
      var sbacData = sbacSheet.getDataRange().getValues();
      if (sbacData.length > 1) {
        var sbacHeaders = sbacData[0].map(function(h) { return String(h).trim().toLowerCase(); });

        var sIdIdx = sbacHeaders.findIndex(function(h) {
          return h === "student id" || h === "id number" || h === "id" || h === "studentid" || h === "student #" || h.indexOf("id") !== -1;
        });
        if (sIdIdx === -1) sIdIdx = 0;

        var sGradeIdx = sbacHeaders.findIndex(function(h) {
          return h === "grade" || h.indexOf("grade") !== -1;
        });
        if (sGradeIdx === -1) sGradeIdx = 3;

        var sSchoolIdx = sbacHeaders.findIndex(function(h) {
          return h === "school" || h === "schoolcode" || h.indexOf("school") !== -1 || h.indexOf("site") !== -1;
        });
        if (sSchoolIdx === -1) sSchoolIdx = 4;

        var sTestIdIdx = sbacHeaders.findIndex(function(h) {
          return h === "testid" || h === "test id" || h.indexOf("test") !== -1;
        });
        if (sTestIdIdx === -1) sTestIdIdx = 5;

        var sPartIdx = sbacHeaders.findIndex(function(h) {
          return h === "part" || h === "subject" || h.indexOf("part") !== -1;
        });
        if (sPartIdx === -1) sPartIdx = 6;

        var sDateIdx = sbacHeaders.findIndex(function(h) {
          return h.indexOf("date") !== -1 || h.indexOf("taken") !== -1 || h.indexOf("time") !== -1;
        });
        if (sDateIdx === -1) sDateIdx = 7;

        var sScoreIdx = sbacHeaders.findIndex(function(h) {
          return h === "s/s" || h === "ss" || h === "scaledscore" || h.indexOf("scale") !== -1 || (h.indexOf("score") !== -1 && h.indexOf("raw") === -1);
        });
        if (sScoreIdx === -1) sScoreIdx = 8;

        var sPerfIdx = sbacHeaders.findIndex(function(h) {
          return h === "performlvl" || h === "perflvl" || h.indexOf("perform") !== -1 || h.indexOf("level") !== -1;
        });
        if (sPerfIdx === -1) sPerfIdx = 9;

        for (var j = 1; j < sbacData.length; j++) {
          var s = sbacData[j];
          var sId = extractCleanStudentId_(s[sIdIdx]);
          
          // Strictly attach scores only to students within the user's authorized server-side scope
          var student = studentsMap[sId];
          if (!student) continue;

          var rawPart = String(s[sPartIdx] || "").trim();
          var rawDate = s[sDateIdx];
          var year = extractYear(rawDate);

          // Clean scaled score (strip commas, spaces, currency symbols)
          var cleanScoreStr = String(s[sScoreIdx] || "").replace(/[^0-9.]/g, "");
          var scaledScore = cleanScoreStr ? Number(cleanScoreStr) : null;
          if (!scaledScore || isNaN(scaledScore)) continue;

          // Identify subject part resiliently (supports "1", "2", "ELA", "Math", "Mathematics", etc.)
          var partUpper = rawPart.toUpperCase();
          var isEla = rawPart === "1" || partUpper === "ELA" || partUpper.indexOf("ELA") !== -1 || partUpper.indexOf("READ") !== -1 || partUpper.indexOf("ENG") !== -1;
          var isMath = rawPart === "2" || partUpper === "MATH" || partUpper.indexOf("MATH") !== -1;
          var standardPart = isEla ? "ELA" : (isMath ? "Math" : rawPart);

          var testGrade = Number(s[sGradeIdx]) || student.grade || null;

          // Clean performance level (parse digits 1-4, or derive from cut score threshold)
          var rawPerf = String(s[sPerfIdx] || "").trim();
          var perfDigits = rawPerf.replace(/\D+/g, "");
          var perfLevel = perfDigits ? parseInt(perfDigits, 10) : null;
          if (isNaN(perfLevel) || perfLevel < 1 || perfLevel > 4) {
            perfLevel = computeCutLevel_(scaledScore, testGrade, standardPart);
          }

          var scoreEntry = {
            testGrade: testGrade,
            schoolCode: String(s[sSchoolIdx] || "").trim(),
            testId: String(s[sTestIdIdx] || "").trim(),
            part: standardPart,
            dateTaken: formatDate(rawDate),
            year: year,
            scaledScore: scaledScore,
            performanceLevel: perfLevel
          };

          if (isEla) {
            student.elaHistory.push(scoreEntry);
          } else if (isMath) {
            student.mathHistory.push(scoreEntry);
          }
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
      // Robust sheet resolution: case-insensitive & trimmed to guard against accidental trailing spaces in tab names
      var sheet = null;
      var allSheets = ss.getSheets();
      for (var s = 0; s < allSheets.length; s++) {
        var cleanTabName = allSheets[s].getName().trim().toLowerCase();
        if (cleanTabName === tab.name.toLowerCase() || cleanTabName === tab.name.replace(/_/g, ' ').toLowerCase()) {
          sheet = allSheets[s];
          break;
        }
      }
      if (!sheet) return;

      var pData = sheet.getDataRange().getValues();
      if (pData.length < 2) return;

      // Identify header indexes with flexible matching (matches "ID Number", "Student ID", "ID", etc.)
      var headers = pData[0].map(function(h) { return String(h).trim().toLowerCase(); });
      var idIdx = headers.findIndex(function(h) { 
        return h === "id number" || h === "student id" || h === "id" || h === "studentid" || 
               h === "student #" || h === "id #" || h.indexOf("id") !== -1; 
      });
      var timeIdx = headers.findIndex(function(h) { 
        return h.indexOf("time") !== -1 || h.indexOf("date") !== -1; 
      });
      var scoreIdx = headers.findIndex(function(h) { 
        return h.indexOf("score") !== -1; 
      });
      var recIdx = headers.findIndex(function(h) { 
        return h.indexOf("recommend") !== -1 || h.indexOf("class") !== -1 || h.indexOf("course") !== -1; 
      });

      if (idIdx === -1 || scoreIdx === -1) return;

      for (var p = 1; p < pData.length; p++) {
        var row = pData[p];
        var rawId = row[idIdx];
        var pId = extractCleanStudentId_(rawId);

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
      
      st.elaHistory.sort(function(a, b) { 
        var yDiff = (a.year || 0) - (b.year || 0);
        if (yDiff !== 0) return yDiff;
        var dateA = a.dateTaken ? new Date(a.dateTaken).getTime() : 0;
        var dateB = b.dateTaken ? new Date(b.dateTaken).getTime() : 0;
        return dateA - dateB;
      });

      st.mathHistory.sort(function(a, b) { 
        var yDiff = (a.year || 0) - (b.year || 0);
        if (yDiff !== 0) return yDiff;
        var dateA = a.dateTaken ? new Date(a.dateTaken).getTime() : 0;
        var dateB = b.dateTaken ? new Date(b.dateTaken).getTime() : 0;
        return dateA - dateB;
      });

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

/**
 * Normalizes Student ID to cleanly match across all tabs:
 * Strips leading '#', trailing '.0', spaces, and leading zeros.
 */
function extractCleanStudentId_(val) {
  if (val === null || val === undefined) return "";
  var s = String(val).trim();
  if (!s || /^(?:id\s*number|student\s*id|id|studentid|stu\s*id)$/i.test(s)) return "";
  var cleaned = s.replace(/^#/, "").replace(/\.0+$/, "").replace(/^0+/, "").trim();
  return cleaned || (s === "0" ? "0" : "");
}

/**
 * Official California CAASPP SBAC Scale Score Cutoff Thresholds (Grades 3 - 11)
 * Computes performance level (1, 2, 3, 4) if missing or non-numeric in raw sheet.
 */
function computeCutLevel_(score, grade, subject) {
  if (!score) return null;
  var cutScores = {
    ELA: {
      3: [2367, 2432, 2490],
      4: [2416, 2473, 2533],
      5: [2442, 2502, 2582],
      6: [2457, 2531, 2618],
      7: [2479, 2552, 2649],
      8: [2487, 2567, 2668],
      11: [2493, 2583, 2682]
    },
    Math: {
      3: [2381, 2436, 2501],
      4: [2411, 2485, 2549],
      5: [2455, 2528, 2579],
      6: [2473, 2552, 2610],
      7: [2484, 2567, 2635],
      8: [2504, 2586, 2653],
      11: [2543, 2628, 2718]
    }
  };
  var g = Number(grade) || 11;
  if (g >= 9) g = 11;
  var sub = String(subject || "").toUpperCase().indexOf("MATH") !== -1 ? "Math" : "ELA";
  var cuts = cutScores[sub] ? cutScores[sub][g] : (cutScores.ELA[g] || cutScores.ELA[11]);
  if (!cuts) return null;
  if (score < cuts[0]) return 1;
  if (score < cuts[1]) return 2;
  if (score < cuts[2]) return 3;
  return 4;
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
  
  if (userAccess.role === "ElementaryTeacher") {
    return staffEmail === userAccess.email;
  }

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
