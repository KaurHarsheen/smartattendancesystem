import { useEffect, useState } from "react";
import client from "../../api/client";

interface Teacher {
    id: number;
    email: string;
    full_name: string;
    teacher_id: string;
    department?: string;
}

interface CourseOffering {
    id: number;
    course_code: string;
    course_name: string;
    term: string;
    room: string;
}

interface TeacherWithCourses extends Teacher {
    offerings: CourseOffering[];
}

export function AdminTeachers() {
    const [teachers, setTeachers] = useState<TeacherWithCourses[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<string | null>(null);

    const fetchTeachers = async () => {
        try {
            const { data } = await client.get("/admin/teachers/details");
            setTeachers(data);
        } catch (error) {
            console.error("Failed to fetch teachers", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeachers();
    }, []);

    const handleDeleteOffering = async (offeringId: number) => {
        if (!confirm("Are you sure you want to remove this course assignment?")) return;
        try {
            await client.delete(`/admin/course-offerings/${offeringId}`);
            setToast("Course assignment removed.");
            fetchTeachers();
        } catch (error: any) {
            setToast(error.response?.data?.detail ?? "Failed to remove course.");
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading teachers...</div>;

    return (
        <div className="space-y-6">
            {toast && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm cursor-pointer" onClick={() => setToast(null)}>
                    {toast}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {teachers.map((teacher) => (
                    <div key={teacher.id} className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{teacher.full_name}</h3>
                                <p className="text-xs font-mono text-slate-400">{teacher.teacher_id}</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold">
                                {teacher.full_name.charAt(0)}
                            </div>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-slate-600 flex items-center gap-2">
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                {teacher.email}
                            </p>
                            {teacher.department && (
                                <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                    {teacher.department}
                                </p>
                            )}
                        </div>

                        <div className="border-t border-slate-100 pt-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Assigned Courses</h4>
                            {teacher.offerings.length > 0 ? (
                                <ul className="space-y-2">
                                    {teacher.offerings.map((offering) => (
                                        <li key={offering.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                            <div>
                                                <span className="font-semibold text-slate-700">{offering.course_code}</span>
                                                <span className="ml-2 text-xs text-slate-500">{offering.term}</span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteOffering(offering.id)}
                                                className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition-colors"
                                                title="Remove Course Assignment"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-slate-400 italic">No active courses assigned.</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
