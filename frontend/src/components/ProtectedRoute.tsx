import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { Role, useAuthStore } from "../store/auth";

interface Props {
  children: ReactNode;
  role: Role;
}

export function ProtectedRoute({ children, role }: Props) {
  const { token, role: currentRole } = useAuthStore();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (role && currentRole !== role) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}


