import { useEffect, useState } from "react";
import client from "../../api/client";
import { DashboardShell } from "../../layouts/DashboardShell";

interface FaceRequest {
    id: number;
    user_id: number;
    user_name: string;
    user_email: string;
    image_data: string;
    created_at: string;
}

export function FaceApprovalsContent() {
    const [requests, setRequests] = useState<FaceRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const fetchRequests = async () => {
        try {
            const { data } = await client.get("/admin/face-requests");
            setRequests(data);
        } catch (error) {
            console.error("Failed to fetch requests", error);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (id: number, action: "approve" | "reject") => {
        setLoading(true);
        try {
            await client.post(`/admin/face-requests/${id}/${action}`);
            setToast({ message: `Request ${action}d successfully`, type: "success" });
            fetchRequests();
        } catch (error) {
            setToast({ message: `Failed to ${action} request`, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-slide-up">
            {toast && (
                <div
                    className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm flex items-center justify-between ${toast.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-rose-200 bg-rose-50 text-rose-800"
                        }`}
                    onClick={() => setToast(null)}
                >
                    <span>{toast.message}</span>
                    <button className="opacity-50 hover:opacity-100">✕</button>
                </div>
            )}

            <div className="glass-panel rounded-2xl p-6 shadow-glass">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800">Pending Requests</h2>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
                        {requests.length} Pending
                    </span>
                </div>

                {requests.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {requests.map((req) => (
                            <div key={req.id} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-lg">
                                <div className="mb-4 aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
                                    <img
                                        src={req.image_data}
                                        alt="Face Preview"
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                </div>

                                <div className="mb-4">
                                    <h3 className="text-base font-bold text-slate-900">{req.user_name}</h3>
                                    <p className="text-xs font-medium text-slate-500">{req.user_email}</p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Requested: {new Date(req.created_at).toLocaleDateString()}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleAction(req.id, "reject")}
                                        disabled={loading}
                                        className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleAction(req.id, "approve")}
                                        disabled={loading}
                                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-emerald-500/20 disabled:opacity-50"
                                    >
                                        Approve
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                        <p className="text-sm font-medium text-slate-600">No pending approvals</p>
                        <p className="text-xs text-slate-500 mt-1">All face updates have been processed.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export function AdminFaceApprovals() {
    return (
        <DashboardShell title="Face Update Approvals">
            <FaceApprovalsContent />
        </DashboardShell>
    );
}
