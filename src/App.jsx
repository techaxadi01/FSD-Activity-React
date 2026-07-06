import { useEffect, useMemo, useState } from 'react';
import './index.css';

const STORAGE_KEY = 'smart-attendance-tracker-v1';
const CLASS_NAME = 'CSE-3';
const SECTION = 'A';
const SUBJECTS = [
  'Data Structures',
  'Operating Systems',
  'Database Systems',
  'Computer Networks',
  'Software Engineering',
];

const STUDENT_NAMES = [
  'Aarav Sharma',
  'Mira Patel',
  'Noah Kim',
  'Sofia Chen',
  'Liam Brooks',
  'Anaya Iyer',
  'Kabir Singh',
  'Isha Nair',
  'Rohan Verma',
  'Meera Joshi',
  'Arjun Das',
  'Priya Menon',
  'Vivaan Rao',
  'Sara Khan',
  'Dev Malhotra',
  'Nora Ali',
  'Aditi Bansal',
  'Yash Shah',
  'Tara Gupta',
  'Advik Mehta',
  'Kiara Fernandez',
  'Om Prakash',
  'Riya Sethi',
  'Kunal Reddy',
  'Bhavya Jain',
  'Zoya Ansari',
  'Harsh Tiwari',
  'Anika Roy',
  'Neil Bhatia',
  'Sanya Kapoor',
];

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, delta) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + delta);
  return nextDate;
}

function formatDateLabel(dateString) {
  return parseLocalDate(dateString).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatLongDate(dateString) {
  return parseLocalDate(dateString).toLocaleDateString('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed) {
  let value = hashString(seed) || 1;
  value ^= value << 13;
  value ^= value >> 17;
  value ^= value << 5;
  return ((value >>> 0) % 1000) / 1000;
}

function createToken(seed) {
  const value = hashString(seed).toString(36).toUpperCase();
  return value.slice(0, 8).padEnd(8, 'X');
}

function createStudents() {
  return STUDENT_NAMES.map((name, index) => ({
    id: `student-${index + 1}`,
    name,
    rollNo: `CS${String(index + 1).padStart(2, '0')}`,
    className: CLASS_NAME,
    section: SECTION,
  }));
}

function createSessionId(date, subject) {
  return `${date}-${slugify(subject)}-${CLASS_NAME}-${SECTION}`;
}

function buildSeedState() {
  const students = createStudents();
  const sessions = [];
  const attendance = [];
  const today = new Date();
  const todayString = getLocalDateString(today);

  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue;
    }

    const dateString = getLocalDateString(date);
    const subject = SUBJECTS[offset % SUBJECTS.length];
    const sessionId = createSessionId(dateString, subject);
    const isActive = dateString === todayString;

    sessions.push({
      id: sessionId,
      date: dateString,
      subject,
      qrToken: createToken(`${sessionId}-qr`),
      isActive,
      className: CLASS_NAME,
      section: SECTION,
    });

    students.forEach((student) => {
      const roll = seededRandom(`${sessionId}-${student.id}`);
      let status = 'present';
      if (roll < 0.12) {
        status = 'absent';
      }

      attendance.push({
        id: `att-${sessionId}-${student.id}`,
        studentId: student.id,
        sessionId,
        status,
        timestamp: `${dateString}T09:${String(10 + Math.floor(roll * 40)).padStart(2, '0')}:00`,
      });
    });
  }

  if (!sessions.some((session) => session.date === todayString)) {
    const subject = SUBJECTS[0];
    const sessionId = createSessionId(todayString, subject);
    sessions.push({
      id: sessionId,
      date: todayString,
      subject,
      qrToken: createToken(`${sessionId}-qr`),
      isActive: true,
      className: CLASS_NAME,
      section: SECTION,
    });
  }

  return { students, sessions, attendance };
}

function normalizeAttendance(attendance) {
  return attendance.map((record) => ({
    ...record,
    status: record.status === 'present' ? 'present' : 'absent',
  }));
}

function loadState() {
  if (typeof window === 'undefined') {
    return buildSeedState();
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return buildSeedState();
    }

    const parsed = JSON.parse(stored);
    if (!parsed?.students || !parsed?.sessions || !parsed?.attendance) {
      return buildSeedState();
    }

    return { ...parsed, attendance: normalizeAttendance(parsed.attendance) };
  } catch {
    return buildSeedState();
  }
}

function getStudentStatusForSession(attendanceMap, sessionId, studentId) {
  return attendanceMap[sessionId]?.[studentId] ?? 'unmarked';
}

function upsertAttendance(attendance, record) {
  const filtered = attendance.filter(
    (entry) => !(entry.sessionId === record.sessionId && entry.studentId === record.studentId)
  );
  filtered.push(record);
  return filtered;
}

function getSessionId(date, subject) {
  return createSessionId(date, subject);
}

function getSessionTitle(session) {
  return `${session.subject} - ${formatDateLabel(session.date)}`;
}

function getAttendanceScore(records) {
  if (!records.length) {
    return 0;
  }

  const weighted = records.reduce((sum, record) => {
    if (record.status === 'present') {
      return sum + 1;
    }

    return sum;
  }, 0);

  return Math.round((weighted / records.length) * 100);
}

function getBadgeForScore(score) {
  if (score >= 85) {
    return { label: 'Safe', className: 'badge-safe' };
  }

  if (score >= 75) {
    return { label: 'Warning', className: 'badge-warning' };
  }

  return { label: 'At Risk', className: 'badge-risk' };
}

function getPointSummary(status) {
  if (status === 'present') {
    return { label: 'Present', value: 100, className: 'status-present' };
  }

  if (status === 'absent') {
    return { label: 'Absent', value: 0, className: 'status-absent' };
  }

  return { label: 'No class', value: null, className: 'status-empty' };
}

function buildHeatmapDates(endDate, days = 30) {
  return Array.from({ length: days }, (_, index) =>
    getLocalDateString(addDays(endDate, index - (days - 1)))
  );
}

function buildQrMatrix(token, size = 25) {
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  const seed = hashString(token);
  const corners = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];

  corners.forEach(([startRow, startCol]) => {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        const outer = row === 0 || row === 6 || col === 0 || col === 6;
        const inner = row >= 2 && row <= 4 && col >= 2 && col <= 4;
        matrix[startRow + row][startCol + col] = outer || inner;
      }
    }
  });

  let cursor = seed;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const inFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col >= size - 7) ||
        (row >= size - 7 && col < 7);

      if (inFinder) {
        continue;
      }

      cursor = (cursor * 1664525 + 1013904223) >>> 0;
      matrix[row][col] = cursor % 5 < 2;
    }
  }

  return matrix;
}

function ProgressRing({ value, label }) {
  const radius = 58;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="progress-ring">
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <defs>
          <linearGradient id="progressGradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#4f6ef7" />
            <stop offset="100%" stopColor="#2ec4b6" />
          </linearGradient>
        </defs>
        <circle
          className="progress-track"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx="70"
          cy="70"
        />
        <circle
          className="progress-value"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx="70"
          cy="70"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="progress-ring-label">
        <strong>{value}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function MiniChart({ values }) {
  const width = 360;
  const height = 160;
  const padding = 14;
  const points = values.map((value, index) => {
    const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (value / 100) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mini-chart" aria-label="Attendance trend">
      <defs>
        <linearGradient id="trendGradient" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#4f6ef7" />
          <stop offset="100%" stopColor="#2ec4b6" />
        </linearGradient>
      </defs>
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="chart-axis" />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="chart-axis" />
      <polyline points={points.join(' ')} className="chart-line" />
      {values.map((value, index) => {
        const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
        const y = height - padding - (value / 100) * (height - padding * 2);
        return <circle key={index} cx={x} cy={y} r="4" className="chart-dot" />;
      })}
    </svg>
  );
}

function App() {
  const [data, setData] = useState(() => loadState());
  const [view, setView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());
  const [selectedSubject, setSelectedSubject] = useState(SUBJECTS[0]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [reportFilters, setReportFilters] = useState(() => ({
    className: 'All',
    subject: 'All',
    from: getLocalDateString(addDays(new Date(), -14)),
    to: getLocalDateString(),
  }));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (data.students.length && !selectedStudentId) {
      setSelectedStudentId(data.students[0].id);
    }
  }, [data.students, selectedStudentId]);

  const currentSessionId = getSessionId(selectedDate, selectedSubject);
  const currentSession =
    data.sessions.find((entry) => entry.id === currentSessionId && entry.className === CLASS_NAME) ??
    null;
  const activeSession = data.sessions.find((entry) => entry.isActive) ?? null;

  const attendanceBySession = useMemo(() => {
    return data.attendance.reduce((map, record) => {
      if (!map[record.sessionId]) {
        map[record.sessionId] = {};
      }
      map[record.sessionId][record.studentId] = record.status;
      return map;
    }, {});
  }, [data.attendance]);

  const currentRoster = useMemo(() => {
    return data.students.map((student) => ({
      ...student,
      status: getStudentStatusForSession(attendanceBySession, currentSessionId, student.id),
    }));
  }, [attendanceBySession, currentSessionId, data.students]);

  const currentStats = useMemo(() => {
    const marked = currentRoster.filter((student) => student.status !== 'unmarked');
    const present = marked.filter((student) => student.status === 'present').length;
    const absent = marked.filter((student) => student.status === 'absent').length;

    return {
      marked: marked.length,
      total: data.students.length,
      present,
      absent,
      percentage: Math.round((marked.length / data.students.length) * 100) || 0,
    };
  }, [currentRoster, data.students.length]);

  const selectedStudent = useMemo(
    () => data.students.find((student) => student.id === selectedStudentId) ?? data.students[0] ?? null,
    [data.students, selectedStudentId]
  );

  const studentSessions = useMemo(() => {
    if (!selectedStudent) {
      return [];
    }

    return [...data.sessions]
      .filter((session) => session.className === selectedStudent.className)
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((session) => {
        const status = attendanceBySession[session.id]?.[selectedStudent.id] ?? 'unmarked';
        return { ...session, status };
      });
  }, [attendanceBySession, data.sessions, selectedStudent]);

  const studentScore = useMemo(() => getAttendanceScore(studentSessions.filter((item) => item.status !== 'unmarked')), [studentSessions]);
  const studentBadge = getBadgeForScore(studentScore);

  const studentTrend = useMemo(() => {
    return studentSessions.slice(-12).map((session) => getPointSummary(session.status).value ?? 0);
  }, [studentSessions]);

  const studentHistory = useMemo(() => {
    return [...studentSessions].slice(-10).reverse();
  }, [studentSessions]);

  const reportSessions = useMemo(() => {
    return data.sessions.filter((session) => {
      if (reportFilters.className !== 'All' && session.className !== reportFilters.className) {
        return false;
      }

      if (reportFilters.subject !== 'All' && session.subject !== reportFilters.subject) {
        return false;
      }

      return session.date >= reportFilters.from && session.date <= reportFilters.to;
    });
  }, [data.sessions, reportFilters]);

  const reportRecords = useMemo(() => {
    const sessionIds = new Set(reportSessions.map((session) => session.id));

    return data.attendance.filter((record) => sessionIds.has(record.sessionId));
  }, [data.attendance, reportSessions]);

  const reportAverage = useMemo(() => {
    if (!reportRecords.length) {
      return 0;
    }

    const score = getAttendanceScore(reportRecords);
    return score;
  }, [reportRecords]);

  const riskCount = useMemo(() => {
    return data.students.filter((student) => {
      const records = studentSessions.filter((session) => session.status !== 'unmarked');
      return getAttendanceScore(records) < 75;
    }).length;
  }, [data.students, studentSessions]);

  const sessionTitle = currentSession ? getSessionTitle(currentSession) : `${selectedSubject} - ${formatDateLabel(selectedDate)}`;
  const ensureSession = (makeActive = false) => {
    setData((current) => {
      const sessionId = getSessionId(selectedDate, selectedSubject);
      let nextSessions = [...current.sessions];
      let session = nextSessions.find((entry) => entry.id === sessionId);

      if (!session) {
        session = {
          id: sessionId,
          date: selectedDate,
          subject: selectedSubject,
          qrToken: createToken(`${sessionId}-qr`),
          isActive: false,
          className: CLASS_NAME,
          section: SECTION,
        };
        nextSessions.push(session);
      }

      if (makeActive) {
        nextSessions = nextSessions.map((entry) =>
          entry.id === sessionId
            ? { ...entry, isActive: true, qrToken: createToken(`${sessionId}-qr`) }
            : { ...entry, isActive: false }
        );
      }

      return { ...current, sessions: nextSessions };
    });
  };

  const updateAttendance = (studentId, status) => {
    ensureSession(false);

    setData((current) => {
      const sessionId = getSessionId(selectedDate, selectedSubject);
      const nextAttendance = upsertAttendance(current.attendance, {
        id: `att-${sessionId}-${studentId}`,
        studentId,
        sessionId,
        status,
        timestamp: new Date().toISOString(),
      });

      const nextSessions = current.sessions.some((entry) => entry.id === sessionId)
        ? current.sessions
        : [
            ...current.sessions,
            {
              id: sessionId,
              date: selectedDate,
              subject: selectedSubject,
              qrToken: createToken(`${sessionId}-qr`),
              isActive: false,
              className: CLASS_NAME,
              section: SECTION,
            },
          ];

      return { ...current, sessions: nextSessions, attendance: nextAttendance };
    });
  };

  const markAllPresent = () => {
    ensureSession(false);

    setData((current) => {
      const sessionId = getSessionId(selectedDate, selectedSubject);
      const nextAttendance = current.students.reduce(
        (accumulator, student) =>
          upsertAttendance(accumulator, {
            id: `att-${sessionId}-${student.id}`,
            studentId: student.id,
            sessionId,
            status: 'present',
            timestamp: new Date().toISOString(),
          }),
        current.attendance
      );

      const nextSessions = current.sessions.some((entry) => entry.id === sessionId)
        ? current.sessions
        : [
            ...current.sessions,
            {
              id: sessionId,
              date: selectedDate,
              subject: selectedSubject,
              qrToken: createToken(`${sessionId}-qr`),
              isActive: false,
              className: CLASS_NAME,
              section: SECTION,
            },
          ];

      return { ...current, sessions: nextSessions, attendance: nextAttendance };
    });
  };

  const startSession = () => {
    ensureSession(true);
  };

  const exportCsv = () => {
    const rows = [
      ['date', 'subject', 'class', 'section', 'rollNo', 'student', 'status', 'timestamp'],
      ...reportRecords.map((record) => {
        const student = data.students.find((entry) => entry.id === record.studentId);
        const session = data.sessions.find((entry) => entry.id === record.sessionId);
        return [
          session?.date ?? '',
          session?.subject ?? '',
          session?.className ?? '',
          session?.section ?? '',
          student?.rollNo ?? '',
          student?.name ?? '',
          record.status,
          record.timestamp,
        ];
      }),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'attendance-report.csv';
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const renderTeacherDashboard = () => (
    <div className="dashboard-grid">
      <section className="panel panel-hero">
        <div className="hero-copy">
          <p className="eyebrow">Teacher dashboard</p>
          <h1>Smart Student Attendance Tracker</h1>
          <p className="subtitle">
            Start a live session, mark attendance in seconds.
          </p>
        </div>

        <div className="controls-row">
          <label className="field">
            <span>Date</span>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </label>

          <label className="field">
            <span>Subject</span>
            <select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)}>
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="primary-button" onClick={startSession}>
            Start Session
          </button>
        </div>
      </section>

      <section className="panel roster-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Session roster</p>
            <h2>{sessionTitle}</h2>
          </div>

          <div className="panel-actions">
            <button type="button" className="ghost-button" onClick={markAllPresent}>
              Mark All Present
            </button>
          </div>
        </div>

        <div className="roster-table">
          <div className="roster-row roster-head">
            <span>Student</span>
            <span>Register No.</span>
            <span>Class</span>
            <span>Status</span>
            <span>Quick mark</span>
          </div>

          {currentRoster.map((student) => (
            <div className="roster-row" key={student.id}>
              <button
                type="button"
                className="student-link"
                onClick={() => {
                  setSelectedStudentId(student.id);
                  setView('student');
                }}
                >
                <strong>{student.name}</strong>
              </button>
              <span>{student.rollNo}</span>
              <span>
                {student.className} / {student.section}
              </span>
              <span className={`status-pill ${student.status}`}>
                {student.status === 'unmarked' ? 'Not marked' : student.status}
              </span>
              <div className="quick-buttons">
                <button type="button" className="chip present" onClick={() => updateAttendance(student.id, 'present')}>
                  Present
                </button>
                <button type="button" className="chip absent" onClick={() => updateAttendance(student.id, 'absent')}>
                  Absent
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="panel sidebar">
        <div className="summary-card">
          <p className="eyebrow">Live counter</p>
          <strong>
            {currentStats.marked}/{currentStats.total}
          </strong>
          <span>Marked for this session</span>
        </div>

        <div className="mini-stat-grid">
          <div>
            <span>Present</span>
            <strong>{currentStats.present}</strong>
          </div>
          <div>
            <span>Absent</span>
            <strong>{currentStats.absent}</strong>
          </div>
          <div>
            <span>Marked</span>
            <strong>{currentStats.marked}</strong>
          </div>
        </div>

        <div className="session-card">
          <p className="eyebrow">Active session</p>
          <strong>{activeSession ? activeSession.subject : 'No live session'}</strong>
          <span>{activeSession ? formatLongDate(activeSession.date) : 'Start a session to generate a QR token.'}</span>
        </div>

        <div className="recent-card">
          <p className="eyebrow">Recent marks</p>
          <div className="recent-list">
            {data.attendance
              .filter((entry) => entry.sessionId === activeSession?.id)
              .slice(-5)
              .reverse()
              .map((entry) => {
                const student = data.students.find((item) => item.id === entry.studentId);
                return (
                  <div className="recent-item" key={entry.id}>
                    <strong>{student?.name}</strong>
                    <span className={`status-pill ${entry.status}`}>{entry.status}</span>
                  </div>
                );
              })}
            {!activeSession || data.attendance.filter((entry) => entry.sessionId === activeSession?.id).length === 0 ? (
              <p className="muted">No marks yet for the current session.</p>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );

  const renderStudentDetail = () => {
    if (!selectedStudent) {
      return (
        <div className="panel">
          <p className="muted">No student selected.</p>
        </div>
      );
    }

    return (
      <div className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Student detail / risk view</p>
            <h2>{selectedStudent.name}</h2>
          </div>
          <div className="panel-actions">
            <select value={selectedStudent.id} onChange={(event) => setSelectedStudentId(event.target.value)}>
              {data.students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
            <button type="button" className="ghost-button" onClick={() => setView('dashboard')}>
              Back to dashboard
            </button>
          </div>
        </div>

        <div className="detail-grid">
          <section className="detail-card">
            <ProgressRing value={studentScore} label={studentBadge.label} />
            <div className={`badge ${studentBadge.className}`}>{studentBadge.label}</div>
            <div className="student-meta">
              <div>
                <span>Roll no</span>
                <strong>{selectedStudent.rollNo}</strong>
              </div>
              <div>
                <span>Class</span>
                <strong>
                  {selectedStudent.className} / {selectedStudent.section}
                </strong>
              </div>
            </div>
          </section>

          <section className="detail-card">
            <p className="eyebrow">Trend line</p>
            <MiniChart values={studentTrend.length ? studentTrend : [0]} />
            <div className="mini-stat-grid compact">
              <div>
                <span>Present</span>
                <strong>{studentHistory.filter((entry) => entry.status === 'present').length}</strong>
              </div>
              <div>
                <span>Absent</span>
                <strong>{studentHistory.filter((entry) => entry.status === 'absent').length}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{studentHistory.length}</strong>
              </div>
            </div>
          </section>
        </div>

        <section className="detail-card history-card">
          <p className="eyebrow">Recent history</p>
          <div className="history-list">
            {studentHistory.map((session) => (
              <div className="history-row" key={session.id}>
                <div>
                  <strong>{session.subject}</strong>
                  <span>{formatLongDate(session.date)}</span>
                </div>
                <span className={`status-pill ${session.status}`}>{session.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  const renderReports = () => (
    <div className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Reports</p>
          <h2>Export-ready attendance summary</h2>
        </div>
        <button type="button" className="primary-button" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <div className="report-filters">
        <label className="field">
          <span>Class</span>
          <select
            value={reportFilters.className}
            onChange={(event) =>
              setReportFilters((current) => ({ ...current, className: event.target.value }))
            }
          >
            <option value="All">All</option>
            <option value={CLASS_NAME}>{CLASS_NAME}</option>
          </select>
        </label>

        <label className="field">
          <span>Subject</span>
          <select
            value={reportFilters.subject}
            onChange={(event) =>
              setReportFilters((current) => ({ ...current, subject: event.target.value }))
            }
          >
            <option value="All">All</option>
            {SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>From</span>
          <input
            type="date"
            value={reportFilters.from}
            onChange={(event) =>
              setReportFilters((current) => ({ ...current, from: event.target.value }))
            }
          />
        </label>

        <label className="field">
          <span>To</span>
          <input
            type="date"
            value={reportFilters.to}
            onChange={(event) =>
              setReportFilters((current) => ({ ...current, to: event.target.value }))
            }
          />
        </label>
      </div>

      <div className="report-summary">
        <div className="report-number">
          <span>Class average</span>
          <strong>{reportAverage}%</strong>
        </div>
        <div className="mini-stat-grid compact">
          <div>
            <span>Sessions</span>
            <strong>{reportSessions.length}</strong>
          </div>
          <div>
            <span>Attendance rows</span>
            <strong>{reportRecords.length}</strong>
          </div>
          <div>
            <span>At risk</span>
            <strong>{riskCount}</strong>
          </div>
        </div>
      </div>

      <div className="report-table">
        {reportSessions
          .slice()
          .reverse()
          .map((session) => {
            const sessionRecords = data.attendance.filter((entry) => entry.sessionId === session.id);
            const sessionScore = getAttendanceScore(sessionRecords);
            const markedCount = sessionRecords.length;
            return (
              <div className="report-row" key={session.id}>
                <div>
                  <strong>{session.subject}</strong>
                  <span>{formatLongDate(session.date)}</span>
                </div>
                <div>
                  <span>{markedCount}/{data.students.length} records</span>
                  <strong>{sessionScore}%</strong>
                </div>
                <span className={`status-pill ${session.isActive ? 'present' : 'absent'}`}>
                  {session.isActive ? 'Live' : 'Archived'}
                </span>
              </div>
            );
          })}
        {!reportSessions.length ? <p className="muted">No sessions match the selected filters.</p> : null}
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Smart attendance tracker</p>
          <strong>{formatLongDate(getLocalDateString())}</strong>
        </div>

        <nav className="nav-tabs">
          {[
            ['dashboard', 'Dashboard'],
            ['student', 'Student Detail'],
            ['reports', 'Reports'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={view === key ? 'nav-tab active' : 'nav-tab'}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {view === 'dashboard' ? renderTeacherDashboard() : null}
      {view === 'student' ? renderStudentDetail() : null}
      {view === 'reports' ? renderReports() : null}

    </div>
  );
}

export default App;
