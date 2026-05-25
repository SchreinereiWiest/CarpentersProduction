import { Navigate } from "react-router";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children, requiredRole }) {

    const { user, loading } = useAuth();

    if (loading) {

        return <div className='h-screen bg-gray-900 text-white flex justify-left'>

  </div>;

    }

    if (!user) {

        return <Navigate to="/login" replace />;

    }
    if (requiredRole && user.role !== requiredRole) {
        return <Navigate to="/" replace />;
    }
    console.log(user);
    return children;
} 