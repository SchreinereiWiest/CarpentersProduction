import { Navigate } from "react-router";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }) {

    const { user, loading } = useAuth();

    if (loading) {

        return <div>Loading...</div>;

    }

    if (!user) {

        return <Navigate to="/login" replace />;

    }
    console.log(user);
    return children;
} 