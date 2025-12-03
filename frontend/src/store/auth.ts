import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "ADMIN" | "TEACHER" | "STUDENT" | null;

interface AuthState {
  token: string | null;
  role: Role;
  fullName: string | null;
  mustChangePassword: boolean;
  setAuth: (data: { token: string; role: Role; fullName: string; mustChangePassword: boolean }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      fullName: null,
      mustChangePassword: false,
      setAuth: ({ token, role, fullName, mustChangePassword }) =>
        set({ token, role, fullName, mustChangePassword }),
      logout: () => set({ token: null, role: null, fullName: null, mustChangePassword: false }),
    }),
    {
      name: "ucs503-auth",
    },
  ),
);


