interface EnrolledCourse {
    id: number;
    course_code: string;
    course_name: string;
    teacher_name: string;
    term: string;
    room: string | null;
    active: boolean;
}

interface Props {
    courses: EnrolledCourse[];
}

export function StudentCourses({ courses }: Props) {
    return (
        <div className="animate-slide-up">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Courses</h2>
                <p className="text-slate-500 mt-1">View all your enrolled courses and their details.</p>
            </div>

            {courses.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {courses.map((course) => (
                        <div key={course.id} className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 p-4">
                                {course.active ? (
                                    <span className="flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                ) : (
                                    <span className="h-2.5 w-2.5 rounded-full bg-slate-300"></span>
                                )}
                            </div>

                            <div className="mb-6">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-sm group-hover:bg-brand-600 group-hover:text-white transition-colors duration-300">
                                    <span className="font-bold text-lg">{course.course_code.substring(0, 2)}</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{course.course_name}</h3>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">{course.course_code}</p>
                            </div>

                            <div className="space-y-3 border-t border-slate-50 pt-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-slate-500">Teacher</span>
                                    <span className="font-semibold text-slate-700">{course.teacher_name}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-slate-500">Term</span>
                                    <span className="font-semibold text-slate-700">{course.term}</span>
                                </div>
                                {course.room && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium text-slate-500">Room</span>
                                        <span className="font-semibold text-slate-700">{course.room}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                    <div className="h-16 w-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                        <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <p className="text-base font-bold text-slate-700">No courses enrolled yet</p>
                    <p className="text-sm text-slate-500 mt-1">Contact your administrator to get started.</p>
                </div>
            )}
        </div>
    );
}
