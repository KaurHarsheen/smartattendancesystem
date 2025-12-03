import { useEffect, useState } from "react";
import client from "../../api/client";
import { DashboardShell } from "../../layouts/DashboardShell";
import { TeacherAttendance } from "./TeacherAttendance";
import { TeacherStudents } from "./TeacherStudents";
import { TeacherProfile } from "./TeacherProfile";

interface Offering {
  id: number;
  course_code: string;
  course_name: string;
  term: string;
  room: string;
  active: boolean;
}

type TeacherPage = "attendance" | "students" | "profile";

export function TeacherDashboard() {
  const [activePage, setActivePage] = useState<TeacherPage>("attendance");
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<string>("Loading...");

  useEffect(() => {
    client.get("/faces/model-info").then(({ data }) => setModelInfo(data.model)).catch(() => setModelInfo("Unknown Model"));
  }, []);

  const fetchOfferings = async () => {
    try {
      const { data } = await client.get("/teacher/offerings");
      setOfferings(data);
    } catch (error: any) {
      setToast(error.response?.data?.detail ?? "Unable to load offerings.");
    }
  };

  useEffect(() => {
    fetchOfferings();
  }, []);

  const pages: { id: TeacherPage; label: string }[] = [
    { id: "attendance", label: "My Courses" },
    { id: "students", label: "Student Directory" },
    { id: "profile", label: "Profile & Settings" },
  ];

  return (
    <DashboardShell title="Teacher Workspace">
      {toast && (
        <div className="mb-6 animate-fade-in rounded-xl border border-emerald-200 bg-emerald-50/80 backdrop-blur px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm flex items-center justify-between" onClick={() => setToast(null)}>
          <span>{toast}</span>
          <button className="text-emerald-600 hover:text-emerald-900">✕</button>
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

      {/* My Courses / Attendance Page */}
      {activePage === "attendance" && (
        <TeacherAttendance offerings={offerings} />
      )}

      {/* Student Directory Page */}
      {activePage === "students" && (
        <TeacherStudents offerings={offerings} />
      )}

      {/* Profile Page */}
      {activePage === "profile" && (
        <TeacherProfile />
      )}

      {/* Model Info Footer */}
      <div className="fixed bottom-4 right-4 z-50 rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 backdrop-blur-sm shadow-sm border border-white/50 pointer-events-none">
        Model: {modelInfo}
      </div>
    </DashboardShell>
  );
}


