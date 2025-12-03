import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import client from "../api/client";
import { Role, useAuthStore } from "../store/auth";

const roles: { value: Role; label: string; blurb: string }[] = [
  { value: "ADMIN", label: "Admin", blurb: "Manage catalog & people" },
  { value: "TEACHER", label: "Teacher", blurb: "Conduct sessions" },
  { value: "STUDENT", label: "Student", blurb: "View attendance" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("ADMIN");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get("role")?.toUpperCase();
    if (roleParam && ["ADMIN", "TEACHER", "STUDENT"].includes(roleParam)) {
      setSelectedRole(roleParam as Role);
    }
  }, [searchParams]);

  const roleMessage = useMemo(() => roles.find((role) => role.value === selectedRole)?.blurb ?? "", [selectedRole]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new URLSearchParams();
      formData.append("username", email.trim());
      formData.append("password", password);
      formData.append("scope", selectedRole);
      const { data } = await client.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      if (selectedRole && data.role !== selectedRole) {
        setError(`Those credentials belong to the ${data.role} workspace. Switch the role selection to continue.`);
        setLoading(false);
        return;
      }
      setAuth({
        token: data.access_token,
        role: data.role,
        fullName: data.full_name,
        mustChangePassword: data.must_change_password,
      });
      if (data.role === "ADMIN") navigate("/admin");
      if (data.role === "TEACHER") navigate("/teacher");
      if (data.role === "STUDENT") navigate("/student");
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Unable to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Side - Hero/Brand */}
      <div className="hidden w-1/2 flex-col justify-between bg-brand-900 p-12 text-white lg:flex relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/90 to-brand-800/90"></div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="text-lg font-bold">U</span>
            </div>
            <span className="text-lg font-bold tracking-wide">UCS503</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="mb-6 text-5xl font-bold leading-tight">
            Smart Attendance Management
          </h1>
          <p className="text-lg text-brand-100">
            Experience the future of classroom management with our AI-powered face recognition attendance system. Secure, fast, and reliable.
          </p>
        </div>

        <div className="relative z-10 flex gap-4 text-sm text-brand-200">
          <span>© 2025 UCS503 Project</span>
          <span>•</span>
          <span>Privacy Policy</span>
          <span>•</span>
          <span>Terms of Service</span>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex w-full flex-col justify-center bg-white px-6 py-12 lg:w-1/2 lg:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <Link to="/" className="mb-6 inline-flex items-center text-sm font-semibold text-brand-600 lg:hidden">
              ← Back home
            </Link>
            <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-2 text-slate-500">Please enter your details to sign in.</p>
          </div>

          <div className="mb-8 grid grid-cols-3 gap-3">
            {roles.map((role) => (
              <button
                type="button"
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={`rounded-xl border px-2 py-3 text-center text-xs font-bold uppercase tracking-wide transition-all ${selectedRole === role.value
                    ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500"
                    : "border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:bg-slate-50"
                  }`}
              >
                {role.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Password</label>
                <a href="#" className="text-sm font-semibold text-brand-600 hover:text-brand-700">Forgot password?</a>
              </div>
              <input
                type="password"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition-all hover:bg-brand-700 hover:shadow-brand-600/40 active:scale-[0.98] disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Signing in...
                </span>
              ) : (
                `Sign in as ${roles.find(r => r.value === selectedRole)?.label}`
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500">
            Don't have an account? <a href="#" className="font-semibold text-brand-600 hover:text-brand-700">Contact Admin</a>
          </div>

          <div className="mt-8 rounded-xl bg-slate-50 p-4 text-xs text-slate-500 border border-slate-100">
            <p className="font-semibold text-slate-700 mb-1">Testing Credentials:</p>
            <p>Admin: admin@example.com / password123</p>
            <p>Teacher: teacher1@example.com / password123</p>
            <p>Student: student1@example.com / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
