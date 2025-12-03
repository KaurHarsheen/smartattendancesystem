import { FormEvent, useEffect, useMemo, useState } from "react";
import client from "../../api/client";
import { DashboardShell } from "../../layouts/DashboardShell";
import { FaceApprovalsContent } from "./AdminFaceApprovals";
import { AdminTeachers } from "./AdminTeachers";

interface DashboardSummary {
  total_users: number;
  total_teachers: number;
  total_students: number;
  total_courses: number;
  active_sessions: number;
}

interface Course {
  id: number;
  code: string;
  name: string;
  branch: string;
  year: number;
}

interface Teacher {
  id: number;
  email: string;
  full_name: string;
  teacher_id: string;
  department?: string;
}

interface Student {
  id: number;
  email: string;
  full_name: string;
  student_id: string;
  branch: string;
  year: number;
}

const defaultSummary: DashboardSummary = {
  total_users: 0,
  total_teachers: 0,
  total_students: 0,
  total_courses: 0,
  active_sessions: 0,
};

const termOptions = ["2025-SPRING", "2025-FALL", "2026-SPRING"];

type AdminPage = "enroll-student" | "enroll-teacher" | "manage-teachers" | "register-class" | "face-approvals";

export function AdminDashboard() {
  const [activePage, setActivePage] = useState<AdminPage>("enroll-student");
  const [summary, setSummary] = useState<DashboardSummary>(defaultSummary);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherForm, setTeacherForm] = useState({
    email: "",
    full_name: "",
    department: "",
  });
  const [studentForm, setStudentForm] = useState({
    email: "",
    full_name: "",
    branch: "COE",
    year: 3,
  });
  const [offeringForm, setOfferingForm] = useState({
    course_code: "",
    teacher_id: "",
    term: termOptions[0],
    room: "LAB-1",
  });
  const [toast, setToast] = useState<string | null>(null);

  const branchOptions = useMemo(() => {
    const values = Array.from(new Set(courses.map((course) => course.branch)));
    return values.length ? values : ["COE", "ECE"];
  }, [courses]);

  const yearOptions = useMemo(() => {
    const scoped = courses.filter((course) => course.branch === studentForm.branch).map((course) => course.year);
    const unique = Array.from(new Set(scoped)).sort();
    return unique.length ? unique : [2, 3];
  }, [courses, studentForm.branch]);

  const fetchSummary = async () => {
    const { data } = await client.get("/admin/dashboard");
    setSummary(data);
  };

  const fetchCourses = async () => {
    const { data } = await client.get("/admin/courses");
    setCourses(data);
  };

  const fetchTeachers = async () => {
    const { data } = await client.get("/admin/teachers");
    setTeachers(data);
  };

  const fetchStudents = async () => {
    const { data } = await client.get("/admin/students");
    setStudents(data);
  };

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([fetchSummary(), fetchCourses(), fetchTeachers(), fetchStudents()]);
      setLoading(false);
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (courses.length) {
      setOfferingForm((prev) => ({
        ...prev,
        course_code: prev.course_code || courses[0].code,
      }));
      if (!branchOptions.includes(studentForm.branch)) {
        setStudentForm((prev) => ({
          ...prev,
          branch: courses[0].branch,
          year: courses[0].year,
        }));
      }
    }
  }, [courses, branchOptions, studentForm.branch]);

  useEffect(() => {
    if (teachers.length) {
      setOfferingForm((prev) => ({
        ...prev,
        teacher_id: prev.teacher_id || teachers[0].teacher_id,
      }));
    }
  }, [teachers]);

  const handleTeacherSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      email: teacherForm.email,
      full_name: teacherForm.full_name,
      department: teacherForm.department,
    };
    try {
      const { data } = await client.post("/admin/teachers", payload);
      setToast(`Teacher created. Temporary password: ${data.temporary_password}`);
      setTeacherForm({ email: "", full_name: "", department: "" });
      await Promise.all([fetchSummary(), fetchTeachers()]);
    } catch (error: any) {
      setToast(error.response?.data?.detail ?? "Failed to create teacher");
    }
  };

  const handleStudentSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const { data } = await client.post("/admin/students", studentForm);
      setToast(`Student created. Temporary password: ${data.temporary_password}. Student will be auto-enrolled in courses matching branch ${studentForm.branch} year ${studentForm.year}.`);
      setStudentForm((prev) => ({ ...prev, email: "", full_name: "" }));
      await Promise.all([fetchSummary(), fetchStudents()]);
    } catch (error: any) {
      setToast(error.response?.data?.detail ?? "Failed to create student");
    }
  };

  const handleOfferingSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!offeringForm.course_code || !offeringForm.teacher_id) {
      setToast("Select a course and teacher before creating an offering.");
      return;
    }
    try {
      await client.post("/admin/course-offerings", offeringForm);
      const selectedCourse = courses.find((c) => c.code === offeringForm.course_code);
      setToast(`Course offering created. All students in ${selectedCourse?.branch} year ${selectedCourse?.year} have been automatically enrolled.`);
      await Promise.all([fetchSummary(), fetchStudents()]);
    } catch (error: any) {
      setToast(error.response?.data?.detail ?? "Failed to create course offering");
    }
  };

  if (loading) {
    return (
      <DashboardShell title="Admin Dashboard">
        <p className="rounded-2xl bg-white/80 p-6 text-sm text-slate-500 shadow">Loading admin workspace…</p>
      </DashboardShell>
    );
  }

  const pages: { id: AdminPage; label: string; description: string }[] = [
    { id: "enroll-student", label: "1. Enroll Student", description: "Register new students with branch and year" },
    { id: "enroll-teacher", label: "2. Enroll Teacher", description: "Register teachers" },
    { id: "manage-teachers", label: "3. Manage Teachers", description: "View teachers and manage assignments" },
    { id: "register-class", label: "4. Register for Class", description: "Create course offerings and link students to teachers" },
    { id: "face-approvals", label: "5. Face Approvals", description: "Review and approve student face update requests" },
  ];

  return (
    <DashboardShell title="Admin Dashboard">
      {toast && (
        <div
          className="mb-4 cursor-pointer rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-sm text-emerald-700 shadow-sm"
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      )}

      {/* Summary Cards */}
      <section className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Users", value: summary.total_users },
          { label: "Teachers", value: summary.total_teachers },
          { label: "Students", value: summary.total_students },
          { label: "Courses", value: summary.total_courses },
          { label: "Active Sessions", value: summary.active_sessions },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl bg-white/90 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </section>

      {/* Tab Navigation */}
      <section className="mt-8">
        <div className="flex gap-2 border-b border-slate-200">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={`px-6 py-3 text-sm font-semibold transition-colors ${activePage === page.id
                ? "border-b-2 border-brand-600 text-brand-600"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              {page.label}
            </button>
          ))}
        </div>
      </section>

      {/* Page Content */}
      <section className="mt-6">
        {/* Page 1: Enroll Student */}
        {activePage === "enroll-student" && (
          <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/40">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Enroll Student</h2>
              <p className="mt-1 text-sm text-slate-500">
                Register new students. Students will be automatically enrolled in courses matching their branch and year.
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleStudentSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-600">Email</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Full Name</label>
                  <input
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
                    value={studentForm.full_name}
                    onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-600">Branch</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
                    value={studentForm.branch}
                    onChange={(e) => setStudentForm({ ...studentForm, branch: e.target.value, year: yearOptions[0] || 3 })}
                    required
                  >
                    {branchOptions.map((branch) => (
                      <option value={branch} key={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Year</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
                    value={studentForm.year}
                    onChange={(e) => setStudentForm({ ...studentForm, year: Number(e.target.value) })}
                    required
                  >
                    {yearOptions.map((year) => (
                      <option value={year} key={year}>
                        Year {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                <strong>Note:</strong> Students will be automatically enrolled in all course offerings that match their branch ({studentForm.branch}) and year ({studentForm.year}).
              </div>
              <button
                type="submit"
                className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-500"
              >
                Create Student
              </button>
            </form>
          </div>
        )}

        {/* Page 2: Enroll Teacher */}
        {activePage === "enroll-teacher" && (
          <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/40">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Enroll Teacher</h2>
              <p className="mt-1 text-sm text-slate-500">
                Register new teachers and assign them to courses they will teach.
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleTeacherSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-600">Email</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Full Name</label>
                  <input
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
                    value={teacherForm.full_name}
                    onChange={(e) => setTeacherForm({ ...teacherForm, full_name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Department (Optional)</label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
                  value={teacherForm.department}
                  onChange={(e) => setTeacherForm({ ...teacherForm, department: e.target.value })}
                  placeholder="Computer Science"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-500"
              >
                Create Teacher
              </button>
            </form>
          </div>
        )}

        {/* Page 3: Manage Teachers */}
        {activePage === "manage-teachers" && (
          <AdminTeachers />
        )}

        {/* Page 4: Register for Class */}
        {activePage === "register-class" && (
          <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/40">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Register for Class</h2>
              <p className="mt-1 text-sm text-slate-500">
                Create course offerings to link teachers with courses. Students matching the course branch and year will be automatically enrolled.
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleOfferingSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-600">Course</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
                    value={offeringForm.course_code}
                    onChange={(e) => setOfferingForm({ ...offeringForm, course_code: e.target.value })}
                    required
                  >
                    {courses.map((course) => (
                      <option key={course.code} value={course.code}>
                        {course.code} — {course.name} ({course.branch} Year {course.year})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Teacher</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
                    value={offeringForm.teacher_id}
                    onChange={(e) => setOfferingForm({ ...offeringForm, teacher_id: e.target.value })}
                    required
                  >
                    {teachers.map((teacher) => (
                      <option key={teacher.teacher_id} value={teacher.teacher_id}>
                        {teacher.teacher_id} — {teacher.full_name}
                        {teacher.department && ` (${teacher.department})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-600">Term</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
                    value={offeringForm.term}
                    onChange={(e) => setOfferingForm({ ...offeringForm, term: e.target.value })}
                    required
                  >
                    {termOptions.map((term) => (
                      <option key={term} value={term}>
                        {term}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Room</label>
                  <input
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
                    value={offeringForm.room}
                    onChange={(e) => setOfferingForm({ ...offeringForm, room: e.target.value })}
                    placeholder="LAB-1"
                  />
                </div>
              </div>
              {offeringForm.course_code && (
                <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                  <strong>Auto-enrollment:</strong> All students in{" "}
                  {courses.find((c) => c.code === offeringForm.course_code)?.branch} year{" "}
                  {courses.find((c) => c.code === offeringForm.course_code)?.year} will be automatically enrolled in this offering.
                </div>
              )}
              <button
                type="submit"
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/30 transition hover:bg-slate-800"
              >
                Create Course Offering
              </button>
            </form>
          </div>
        )}

        {/* Page 4: Face Approvals */}
        {activePage === "face-approvals" && (
          <FaceApprovalsContent />
        )}
      </section>
    </DashboardShell>
  );
}
