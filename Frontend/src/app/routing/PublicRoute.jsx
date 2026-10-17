import { Navigate } from "react-router";
import { useAuth } from "../providers/AuthContext.js";

// User überprüfen und bei vorhandenem User auf Home Seite weiterleiten

export default function PublicRoute({ children }) {

    const { user, loading } = useAuth();

    if (loading) {

        return <div>Loading...</div>;

    }

    if (user) {

        return <Navigate to="/" replace />;

    }

    return children;
}