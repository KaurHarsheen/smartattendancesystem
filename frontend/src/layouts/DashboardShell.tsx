import { ReactNode } from "react";
import { useAuthStore } from "../store/auth";

interface Props {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function DashboardShell({ title, actions, children }: Props) {
  const { fullName, role, logout } = useAuthStore();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/50 bg-white/70 backdrop-blur-xl transition-all">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-lg shadow-brand-500/20 ring-1 ring-black/5">
              <span className="text-lg font-bold">U</span>
            </div>
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-widest text-brand-600">UCS503 Project</p>
              <h1 className="text-xl font-bold text-slate-900 leading-tight tracking-tight">{title}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-slate-800">{fullName}</p>
              <p className="text-xs font-medium text-slate-500 capitalize">{role?.toLowerCase()} Workspace</p>
            </div>

            <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>

            <div className="flex items-center gap-3">
              {actions}
              <button
                onClick={logout}
                className="rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 hover:shadow-md active:scale-95 backdrop-blur-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8 animate-fade-in">
        <div className="space-y-8">{children}</div>
      </main>
    </div>
  );
}
