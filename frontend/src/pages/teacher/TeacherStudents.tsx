import { useState, useEffect } from "react";
import client from "../../api/client";

interface Offering {
    id: number;
    course_code: string;
    course_name: string;
    term: string;
    room: string;
    active: boolean;
}

interface EnrolledStudent {
    student_id: string;
    student_name: string;
    email: string;
    branch: string;
    year: number;
    attendance_percentage: number;
}

interface Props {
    offerings: Offering[];
}

export function TeacherStudents({ offerings }: Props) {
    const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
    const [selectedOfferingForStudents, setSelectedOfferingForStudents] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        if (offerings.length > 0 && !selectedOfferingForStudents) {
            setSelectedOfferingForStudents(offerings[0].id);
        }
    }, [offerings, selectedOfferingForStudents]);

    useEffect(() => {
        if (selectedOfferingForStudents) {
            fetchEnrolledStudents(selectedOfferingForStudents);
        }
    }, [selectedOfferingForStudents]);

    const fetchEnrolledStudents = async (offeringId: number) => {
        try {
            const { data } = await client.get(`/teacher/offerings/${offeringId}/students`);
            setEnrolledStudents(data);
        } catch (error: any) {
            setToast(error.response?.data?.detail ?? "Unable to load enrolled students.");
        }
    };

    const filteredStudents = enrolledStudents.filter((student) => {
        const query = searchQuery.toLowerCase();
        return (
            student.student_name.toLowerCase().includes(query) ||
            student.student_id.toLowerCase().includes(query) ||
            student.email.toLowerCase().includes(query) ||
            student.branch.toLowerCase().includes(query)
        );
    });

    return (
        <section className="glass-card rounded-3xl p-8 shadow-soft animate-slide-up">
            {toast && (
                <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" onClick={() => setToast(null)}>
                    {toast}
                </div>
            )}

            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Enrolled Students</h2>
                    <p className="mt-2 text-slate-500 text-lg">
                        Manage enrollment and monitor performance.
                    </p>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <select
                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white pl-4 pr-10 py-3 text-sm font-semibold shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                            value={selectedOfferingForStudents ?? ""}
                            onChange={(e) => setSelectedOfferingForStudents(Number(e.target.value))}
                        >
                            {offerings.map((offering) => (
                                <option value={offering.id} key={offering.id}>
                                    {offering.course_code}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                        </div>
                    </div>

                    <div className="relative flex-1 md:w-64">
                        <input
                            type="text"
                            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm font-medium shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-slate-400">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="max-h-[600px] overflow-auto custom-scrollbar">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
                            <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                <th className="px-6 py-4 font-semibold">Student</th>
                                <th className="px-6 py-4 font-semibold">Contact</th>
                                <th className="px-6 py-4 font-semibold">Academic</th>
                                <th className="px-6 py-4 font-semibold">Attendance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStudents.map((student) => (
                                <tr key={student.student_id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs">
                                                {student.student_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{student.student_name}</p>
                                                <p className="text-xs font-mono text-slate-400">{student.student_id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 font-medium">{student.email}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                                                {student.branch}
                                            </span>
                                            <span className="text-xs text-slate-400">Year {student.year}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${student.attendance_percentage >= 75 ? "bg-emerald-500" :
                                                        student.attendance_percentage >= 50 ? "bg-amber-500" : "bg-rose-500"
                                                        }`}
                                                    style={{ width: `${student.attendance_percentage}%` }}
                                                ></div>
                                            </div>
                                            <span className={`text-xs font-bold ${student.attendance_percentage >= 75 ? "text-emerald-600" :
                                                student.attendance_percentage >= 50 ? "text-amber-600" : "text-rose-600"
                                                }`}>
                                                {student.attendance_percentage}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                                <svg className="h-8 w-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            </div>
                                            <p className="text-lg font-bold text-slate-600">No students found</p>
                                            <p className="text-sm opacity-60">Try adjusting your search filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {enrolledStudents.length > 0 && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 text-xs font-medium text-slate-500 flex justify-between items-center">
                        <span>Showing {filteredStudents.length} of {enrolledStudents.length} students</span>
                    </div>
                )}
            </div>
        </section>
    );
}
