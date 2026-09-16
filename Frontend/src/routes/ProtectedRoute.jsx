import { Navigate } from "react-router";
import { useAuth } from "./AuthContext";

// User überprüfen und bei fehlendem User auf Login Seite weiterleiten

export default function ProtectedRoute({ children, requiredRole }) {

    const { user, loading } = useAuth();

    if (loading) {

        return <div className='h-screen bg-gray-900 text-white flex justify-left'>

  </div>;

    }

    if (!user) {

        return <Navigate to="/login" replace />;

    }

    if (requiredRole && user.role !== requiredRole && user.role != "admin" || (requiredRole === "admin" && user.role !== "admin")) {
        return <Navigate to="/" replace />;
    }
    console.log(user, requiredRole);
    return children;
} 