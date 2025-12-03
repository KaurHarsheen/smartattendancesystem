import { useEffect, useState } from "react";
import client from "../../api/client";
import { DashboardShell } from "../../layouts/DashboardShell";
import { StudentCourses } from "./StudentCourses";
import { StudentProfile } from "./StudentProfile";

interface SummaryItem {
  course_code: string;
  course_name: string;
  presents: number;
  totals: number;
  percentage: number;
}

interface SessionRecord {
  student_id: string;
  student_name: string;
  status: string;
  detected_at: string;
  confidence?: number;
}

interface EnrolledCourse {
  id: number;
  course_code: string;
  course_name: string;
  teacher_name: string;
  term: string;
  room: string | null;
  active: boolean;
}

type StudentPage = "dashboard" | "courses" | "profile";

export function StudentDashboard() {
  const [activePage, setActivePage] = useState<StudentPage>("dashboard");
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [hasFace, setHasFace] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const load = async () => {
    try {
      const [{ data: summaryData }, { data: sessionData }, { data: coursesData }] = await Promise.all([
        client.get("/student/attendance"),
        client.get("/student/attendance/sessions"),
        client.get("/student/courses"),
      ]);
      setSummary(summaryData);
      setSessions(sessionData);
      setEnrolledCourses(coursesData);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    }
  };

  const fetchEnrollment = async () => {
    try {
      const { data } = await client.get("/faces/me");
      setHasFace(data.enrolled);
      setSampleCount(data.samples ?? 0);
    } catch (error) {
      console.error("Failed to fetch enrollment status", error);
    }
  };

  useEffect(() => {
    load();
    fetchEnrollment();
  }, []);

  const pages: { id: StudentPage; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "courses", label: "My Courses" },
    { id: "profile", label: "Profile & Settings" },
  ];

  return (
    <DashboardShell title="Student Workspace">
      {toast && (
        <div className="mb-6 animate-fade-in rounded-xl border border-blue-200 bg-blue-50/80 backdrop-blur px-4 py-3 text-sm font-medium text-blue-800 shadow-sm flex items-center justify-between" onClick={() => setToast(null)}>
          <span>{toast}</span>
          <button className="text-blue-600 hover:text-blue-900">✕</button>
        </div>
      )}

      {/* Tab Navigation */}
      <section className="mb-8 animate-fade-in">
        <div className="flex gap-1 rounded-xl bg-white/40 p-1 backdrop-blur-md border border-white/50 shadow-sm w-fit">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-300 ${activePage === page.id
                ? "bg-white text-brand-600 shadow-sm ring-1 ring-black/5"
                : "text-slate-500 hover:bg-white/30 hover:text-slate-700"
                }`}
            >
              {page.label}
            </button>
          ))}
        </div>
      </section>

      {/* Dashboard Page */}
      {activePage === "dashboard" && (
        <div className="grid gap-8 lg:grid-cols-12 animate-slide-up">
          <div className="lg:col-span-7 space-y-8">
            <div className="glass-card rounded-3xl p-8 shadow-soft">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <svg className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Attendance Overview
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {summary.map((item) => (
                  <div key={item.course_code} className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-brand-100 group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{item.course_code}</p>
                        <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-brand-600 transition-colors" title={item.course_name}>{item.course_name}</p>
                      </div>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold shadow-sm ${item.percentage >= 75 ? "bg-emerald-100 text-emerald-700" :
                        item.percentage >= 50 ? "bg-amber-100 text-amber-700" :
                          "bg-rose-100 text-rose-700"
                        }`}>
                        {Math.round(item.percentage)}%
                      </div>
                    </div>

                    <div>
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">Progress</span>
                        <span className="text-xs font-bold text-slate-700">{item.presents} / {item.totals} Sessions</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${item.percentage >= 75 ? "bg-emerald-500" :
                            item.percentage >= 50 ? "bg-amber-500" :
                              "bg-rose-500"
                            }`}
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
                {!summary.length && (
                  <div className="col-span-2 py-12 text-center">
                    <p className="text-sm text-slate-500 italic">No attendance data available yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-8">
            <div className="glass-card rounded-3xl p-8 shadow-soft">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <svg className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Recent Activity
              </h2>
              <div className="max-h-80 overflow-y-auto custom-scrollbar pr-2">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3 text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sessions.map((session) => (
                      <tr key={session.detected_at} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                            {session.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {new Date(session.detected_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{(session.confidence || 0).toFixed(2)}</span>
                        </td>
                      </tr>
                    ))}
                    {!sessions.length && (
                      <tr>
                        <td colSpan={3} className="px-4 py-12 text-center text-slate-500 italic">
                          No recent sessions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courses Page */}
      {activePage === "courses" && (
        <StudentCourses courses={enrolledCourses} />
      )}

      {/* Profile Page */}
      {activePage === "profile" && (
        <StudentProfile
          hasFace={hasFace}
          sampleCount={sampleCount}
          onEnrollmentUpdate={fetchEnrollment}
        />
      )}
    </DashboardShell>
  );
}
