import { FormEvent, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import client from "../../api/client";
import { CameraCapture } from "../../components/CameraCapture";

interface Offering {
    id: number;
    course_code: string;
    course_name: string;
    term: string;
    room: string;
    active: boolean;
}

interface AttendanceRecord {
    student_id: string;
    student_name: string;
    status: string;
    detected_at: string;
    confidence?: number;
}

interface Props {
    offerings: Offering[];
}

export function TeacherAttendance({ offerings }: Props) {
    const [selectedOffering, setSelectedOffering] = useState<number | null>(null);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<{ message: string; variant: "success" | "error" | "info" } | null>(null);
    const [cameraBusy, setCameraBusy] = useState(false);
    const [probeEmbedding, setProbeEmbedding] = useState<string | null>(null);
    const [matchedEmbedding, setMatchedEmbedding] = useState<string | null>(null);
    const [showDebug, setShowDebug] = useState(false);
    const webcamRef = useRef<Webcam>(null);

    useEffect(() => {
        if (offerings.length > 0 && !selectedOffering) {
            const firstId = offerings[0].id;
            setSelectedOffering(firstId);
            fetchRecords(firstId);
            syncActiveSession(firstId);
        }
    }, [offerings]);

    const syncActiveSession = async (offeringId: number) => {
        try {
            const { data } = await client.get(`/teacher/attendance/active/${offeringId}`);
            setSessionId(data.id);
            setVerificationStatus({ message: `Resumed session ${data.id}`, variant: "info" });
        } catch (error: any) {
            if (error.response?.status === 404) {
                setSessionId(null);
            } else {
                setToast(error.response?.data?.detail ?? "Unable to check active session.");
            }
        }
    };

    const fetchRecords = async (offeringId: number) => {
        try {
            const { data } = await client.get(`/teacher/attendance/${offeringId}`);
            setRecords(data);
        } catch (error: any) {
            console.error("Failed to fetch records", error);
        }
    };

    const handleStartSession = async (event: FormEvent) => {
        event.preventDefault();
        if (!selectedOffering) {
            setToast("Select a course offering before starting a session.");
            return;
        }
        try {
            const { data } = await client.post("/teacher/attendance/start", { course_offering_id: selectedOffering });
            setSessionId(data.id);
            setToast(`Session ${data.id} started successfully!`);
            if (selectedOffering) {
                await fetchRecords(selectedOffering);
            }
        } catch (error: any) {
            setToast(error.response?.data?.detail ?? "Unable to start session.");
        }
    };

    const handleEndSession = async () => {
        if (!sessionId) {
            setToast("No active session to end.");
            return;
        }
        try {
            const { data } = await client.post(`/teacher/attendance/${sessionId}/end`);
            setToast(`Session ${data.id} closed`);
            setSessionId(null);
            if (selectedOffering) fetchRecords(selectedOffering);
        } catch (error: any) {
            setToast(error.response?.data?.detail ?? "Unable to end session.");
        }
    };

    const handleVerificationCapture = async (imageData: string) => {
        if (!sessionId) {
            setVerificationStatus({ message: "Start a session before scanning faces.", variant: "error" });
            return;
        }
        setCameraBusy(true);
        setVerificationStatus({ message: "Uploading frame for verification…", variant: "info" });
        try {
            const { data } = await client.post(`/attendance/${sessionId}/verify-face`, { image_data: imageData });

            setProbeEmbedding(data.probe_embedding || null);
            setMatchedEmbedding(data.matched_embedding || null);

            if (data.matched) {
                setVerificationStatus({
                    message: `Marked ${data.student_name} (${data.student_id}) • confidence ${(data.confidence ?? 0).toFixed(2)}`,
                    variant: "success",
                });
                if (selectedOffering) {
                    await fetchRecords(selectedOffering);
                }
            } else {
                const confidenceText = data.confidence != null ? ` • confidence ${data.confidence.toFixed(2)}` : "";
                setVerificationStatus({
                    message: `${data.message ?? "Face not recognized."}${confidenceText}`,
                    variant: "error",
                });
                if (selectedOffering) {
                    await fetchRecords(selectedOffering);
                }
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail ?? error.message ?? "Unable to verify face.";
            setVerificationStatus({
                message: errorMessage,
                variant: "error",
            });
            setProbeEmbedding(null);
            setMatchedEmbedding(null);
        } finally {
            setCameraBusy(false);
        }
    };

    const handleManualCapture = async () => {
        if (!sessionId) {
            setVerificationStatus({ message: "Start a session before scanning faces.", variant: "error" });
            return;
        }
        const screenshot = webcamRef.current?.getScreenshot();
        if (screenshot) {
            await handleVerificationCapture(screenshot);
        }
    };

    return (
        <div className="animate-slide-up space-y-8">
            {toast && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm cursor-pointer" onClick={() => setToast(null)}>
                    {toast}
                </div>
            )}

            {/* Courses Grid */}
            {!sessionId && (
                <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {offerings.map((offering) => (
                        <div
                            key={offering.id}
                            onClick={() => {
                                setSelectedOffering(offering.id);
                                fetchRecords(offering.id);
                                syncActiveSession(offering.id);
                            }}
                            className={`cursor-pointer group relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm transition-all hover:shadow-md border-2 ${selectedOffering === offering.id ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-transparent hover:border-brand-200'}`}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <svg className="w-24 h-24 text-brand-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                            </div>
                            <div className="relative z-10">
                                <span className="inline-block rounded-lg bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600 mb-3">
                                    {offering.term}
                                </span>
                                <h3 className="text-xl font-bold text-slate-900 mb-1">{offering.course_name}</h3>
                                <p className="text-sm font-mono text-slate-500 mb-4">{offering.course_code}</p>
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {offering.room}
                                </div>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            <section className="glass-panel rounded-3xl p-8 shadow-soft">
                <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Active Session</p>
                        <div className="flex items-center gap-4">
                            <div className={`h-4 w-4 rounded-full shadow-sm ${sessionId ? "bg-emerald-500 animate-pulse-slow" : "bg-slate-200"}`}></div>
                            <div>
                                <h2 className={`text-3xl font-bold tracking-tight ${sessionId ? "text-slate-900" : "text-slate-300"}`}>
                                    {sessionId ? `Session #${sessionId}` : "No Active Session"}
                                </h2>
                                {sessionId && <p className="text-sm font-medium text-emerald-600 mt-1">Live & Recording</p>}
                            </div>
                        </div>
                    </div>

                    <form className="flex flex-col gap-4 sm:flex-row" onSubmit={handleStartSession}>
                        {!sessionId && (
                            <div className="relative group min-w-[200px]">
                                <select
                                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-5 pr-12 py-4 text-sm font-semibold shadow-sm transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 group-hover:border-brand-300"
                                    value={selectedOffering ?? ""}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        setSelectedOffering(value);
                                        fetchRecords(value);
                                        syncActiveSession(value);
                                    }}
                                >
                                    {offerings.map((offering) => (
                                        <option value={offering.id} key={offering.id}>
                                            {offering.course_code}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-brand-500 transition-colors">
                                    <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            {!sessionId ? (
                                <button
                                    className="rounded-2xl bg-brand-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-700 hover:shadow-brand-600/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                                    type="submit"
                                    disabled={!selectedOffering}
                                >
                                    Start Session
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleEndSession}
                                    className="rounded-2xl bg-rose-500 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-600 hover:shadow-rose-500/30 active:scale-95"
                                >
                                    End Session
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </section>

            <div className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-7 space-y-8">
                    <div className="glass-card rounded-3xl p-1 overflow-hidden shadow-soft">
                        <div className="bg-white/50 p-6 backdrop-blur-sm border-b border-white/50">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-800">Live Scanner</h2>
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${sessionId ? "animate-ping bg-rose-400" : "bg-slate-400"}`}></span>
                                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${sessionId ? "bg-rose-500" : "bg-slate-500"}`}></span>
                                    </span>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${sessionId ? "text-rose-600" : "text-slate-500"}`}>
                                        {sessionId ? "Live Feed" : "Offline"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                                Ensure the student is facing the camera directly. The system will automatically capture and verify their identity against the enrolled database.
                            </p>

                            {verificationStatus && (
                                <div
                                    className={`mb-6 rounded-2xl border px-5 py-4 text-sm font-medium shadow-sm transition-all animate-fade-in ${verificationStatus.variant === "success"
                                        ? "border-emerald-200 bg-emerald-50/50 text-emerald-800"
                                        : verificationStatus.variant === "error"
                                            ? "border-rose-200 bg-rose-50/50 text-rose-800"
                                            : "border-blue-200 bg-blue-50/50 text-blue-800"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-6 w-6 items-center justify-center rounded-full ${verificationStatus.variant === "success" ? "bg-emerald-200 text-emerald-700" :
                                            verificationStatus.variant === "error" ? "bg-rose-200 text-rose-700" : "bg-blue-200 text-blue-700"
                                            }`}>
                                            {verificationStatus.variant === "success" ? "✓" : verificationStatus.variant === "error" ? "✕" : "ℹ"}
                                        </div>
                                        {verificationStatus.message}
                                    </div>
                                </div>
                            )}

                            <div className="overflow-hidden rounded-2xl border-4 border-white bg-slate-900 shadow-2xl shadow-slate-200">
                                <CameraCapture
                                    busy={cameraBusy}
                                    onCapture={handleVerificationCapture}
                                    captureLabel={sessionId ? "Capture & Verify" : "Start session to begin"}
                                    label=""
                                    description=""
                                />
                            </div>

                            {/* Manual Capture */}
                            {sessionId && (
                                <div className="mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowDebug(!showDebug)}
                                        className="mb-4 text-xs font-semibold text-slate-400 hover:text-brand-600 transition-colors flex items-center gap-1"
                                    >
                                        {showDebug ? "Hide" : "Show"} Debug Tools
                                    </button>

                                    {showDebug && (
                                        <div className="animate-fade-in space-y-4">
                                            <div className="relative overflow-hidden rounded-2xl border-4 border-white shadow-lg">
                                                <Webcam
                                                    ref={webcamRef}
                                                    screenshotFormat="image/jpeg"
                                                    className="h-48 w-full bg-slate-900 object-cover"
                                                    videoConstraints={{ width: 640, height: 360, facingMode: "user" }}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleManualCapture}
                                                disabled={cameraBusy}
                                                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60"
                                            >
                                                {cameraBusy ? "Processing..." : "Manual Capture"}
                                            </button>

                                            {/* Embeddings Display */}
                                            {(probeEmbedding || matchedEmbedding) && (
                                                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {probeEmbedding && (
                                                            <div>
                                                                <p className="text-[0.65rem] font-bold text-slate-400 mb-1 uppercase">Probe</p>
                                                                <div className="rounded-lg bg-white p-2 border border-slate-200 text-[0.6rem] font-mono text-slate-500 h-16 overflow-hidden break-all">
                                                                    {probeEmbedding.substring(0, 100)}...
                                                                </div>
                                                            </div>
                                                        )}
                                                        {matchedEmbedding && (
                                                            <div>
                                                                <p className="text-[0.65rem] font-bold text-slate-400 mb-1 uppercase">Match</p>
                                                                <div className="rounded-lg bg-white p-2 border border-slate-200 text-[0.6rem] font-mono text-slate-500 h-16 overflow-hidden break-all">
                                                                    {matchedEmbedding.substring(0, 100)}...
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-5 h-full">
                    <div className="glass-card rounded-3xl p-1 h-full flex flex-col shadow-soft">
                        <div className="bg-white/50 p-6 backdrop-blur-sm border-b border-white/50">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-slate-800">Live Attendance</h2>
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                    {records.length} Present
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 p-2 overflow-hidden">
                            <div className="h-full overflow-auto custom-scrollbar pr-2">
                                {records.length > 0 ? (
                                    <div className="space-y-2">
                                        {records.map((record) => (
                                            <div key={record.student_id + record.detected_at} className="group flex items-center justify-between rounded-xl bg-white p-4 shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-brand-100 hover:translate-x-1">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center text-brand-600 font-bold text-sm">
                                                        {record.student_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-sm">{record.student_name}</p>
                                                        <p className="text-xs font-medium text-slate-400">{record.student_id}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-slate-500 mb-1">
                                                        {new Date(record.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <div className="h-1.5 w-12 rounded-full bg-slate-100 overflow-hidden">
                                                            <div
                                                                className="h-full bg-emerald-500 rounded-full"
                                                                style={{ width: `${(record.confidence || 0) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-[0.65rem] font-bold text-emerald-600">{(record.confidence || 0).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                        <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                                            <svg className="h-8 w-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <p className="text-sm font-medium">No records yet</p>
                                        <p className="text-xs opacity-60">Start a session to begin tracking</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
