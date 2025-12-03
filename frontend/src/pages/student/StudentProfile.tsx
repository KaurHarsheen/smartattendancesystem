import { useState, useEffect } from "react";
import client from "../../api/client";
import { CameraCapture } from "../../components/CameraCapture";

interface Props {
    hasFace: boolean;
    sampleCount: number;
    onEnrollmentUpdate: () => void;
}

export function StudentProfile({ hasFace, sampleCount, onEnrollmentUpdate }: Props) {
    // Face Enrollment State
    const [cameraBusy, setCameraBusy] = useState(false);
    const [queuedSamples, setQueuedSamples] = useState<string[]>([]);
    const [captureStatus, setCaptureStatus] = useState<{ variant: "info" | "success" | "error"; message: string } | null>(null);

    // Password Change State
    const [passwordForm, setPasswordForm] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });
    const [passwordStatus, setPasswordStatus] = useState<{ variant: "success" | "error"; message: string } | null>(null);

    const handleQueueCapture = (imageData: string) => {
        setQueuedSamples((prev) => {
            if (prev.length >= 3) return prev;
            const next = [...prev, imageData];
            setCaptureStatus({ variant: "info", message: `Captured sample ${next.length}/3` });
            return next;
        });
    };

    const handleSaveSamples = async () => {
        if (queuedSamples.length < 3) {
            setCaptureStatus({ variant: "error", message: "Capture 3 samples before saving." });
            return;
        }
        setCameraBusy(true);
        setCaptureStatus({ variant: "info", message: "Uploading samples…" });
        try {
            const { data } = await client.post("/faces/capture", { images: queuedSamples });
            const message = data?.message ?? "Face samples stored.";

            if (data.status === "PENDING") {
                setCaptureStatus({ variant: "info", message: "Face update pending admin approval." });
            } else {
                setCaptureStatus({ variant: "success", message: `${message} (${data.samples}/3)` });
            }

            setQueuedSamples([]);
            onEnrollmentUpdate();
        } catch (error: any) {
            const detail = error.response?.data?.detail ?? error.message ?? "Unable to store samples.";
            setCaptureStatus({ variant: "error", message: detail });
        } finally {
            setCameraBusy(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setPasswordStatus({ variant: "error", message: "New passwords do not match." });
            return;
        }
        if (passwordForm.new_password.length < 8) {
            setPasswordStatus({ variant: "error", message: "Password must be at least 8 characters." });
            return;
        }

        try {
            await client.post("/auth/change-password", {
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password,
            });
            setPasswordStatus({ variant: "success", message: "Password updated successfully." });
            setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
        } catch (error: any) {
            setPasswordStatus({ variant: "error", message: error.response?.data?.detail ?? "Failed to update password." });
        }
    };

    return (
        <div className="grid gap-8 lg:grid-cols-2">
            {/* Face Enrollment Section */}
            <div className="glass-card rounded-3xl p-8 shadow-soft">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Face Enrollment</h2>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Capture 3 clear photos of your face to enable automated attendance. Ensure good lighting and look directly at the camera.
                    </p>
                </div>

                <div className="flex-1 flex flex-col">
                    <div className="rounded-2xl border-4 border-white bg-slate-900 overflow-hidden shadow-lg mb-8 relative group">
                        <CameraCapture
                            label=""
                            description=""
                            busy={cameraBusy}
                            onCapture={handleQueueCapture}
                            captureLabel={`Capture Photo (${queuedSamples.length}/3)`}
                        />
                        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20">
                            {queuedSamples.length}/3 Captured
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            {[0, 1, 2].map((idx) => (
                                <div key={idx} className={`aspect-square rounded-2xl border-2 ${queuedSamples[idx] ? "border-emerald-500 shadow-md" : "border-dashed border-slate-200 bg-slate-50"} flex items-center justify-center overflow-hidden relative transition-all`}>
                                    {queuedSamples[idx] ? (
                                        <>
                                            <img
                                                src={queuedSamples[idx]}
                                                alt={`Sample ${idx + 1}`}
                                                className="h-full w-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity"></div>
                                            <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs shadow-sm">✓</div>
                                        </>
                                    ) : (
                                        <span className="text-xs font-bold text-slate-300">{idx + 1}</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                className="w-full rounded-2xl bg-brand-600 px-4 py-4 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition-all hover:bg-brand-700 hover:shadow-brand-600/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                onClick={handleSaveSamples}
                                disabled={cameraBusy || queuedSamples.length < 3}
                            >
                                {cameraBusy ? "Uploading..." : "Complete Enrollment"}
                            </button>

                            {queuedSamples.length > 0 && (
                                <button
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                                    onClick={() => { setQueuedSamples([]); setCaptureStatus({ variant: "info", message: "Cleared captured samples." }); }}
                                    disabled={cameraBusy}
                                >
                                    Reset Samples
                                </button>
                            )}
                        </div>

                        {captureStatus && (
                            <div
                                className={`rounded-xl border px-4 py-3 text-xs font-bold text-center animate-fade-in ${captureStatus.variant === "success"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : captureStatus.variant === "error"
                                        ? "border-rose-200 bg-rose-50 text-rose-700"
                                        : "border-blue-200 bg-blue-50 text-blue-700"
                                    }`}
                            >
                                {captureStatus.message}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Change Password Section */}
            <div className="glass-card rounded-3xl p-8 shadow-soft h-fit">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Change Password</h2>
                    </div>
                    <p className="text-sm text-slate-500">
                        Update your account password. Ensure it is at least 8 characters long.
                    </p>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-600">Current Password</label>
                        <input
                            type="password"
                            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
                            value={passwordForm.current_password}
                            onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-600">New Password</label>
                        <input
                            type="password"
                            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
                            value={passwordForm.new_password}
                            onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                            required
                            minLength={8}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-600">Confirm New Password</label>
                        <input
                            type="password"
                            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
                            value={passwordForm.confirm_password}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                            required
                            minLength={8}
                        />
                    </div>

                    {passwordStatus && (
                        <div className={`rounded-xl border px-4 py-3 text-xs font-bold text-center ${passwordStatus.variant === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
                            }`}>
                            {passwordStatus.message}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800"
                    >
                        Update Password
                    </button>
                </form>
            </div>
        </div>
    );
}
