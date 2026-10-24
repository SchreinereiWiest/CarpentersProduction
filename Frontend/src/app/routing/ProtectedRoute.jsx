import { Navigate } from "react-router";
import { useAuth } from "../providers/AuthContext.js";
import { canAccessRequiredRole } from "./roleAuthorization.js";

// User überprüfen und bei fehlendem User auf Login Seite weiterleiten

export default function ProtectedRoute({ children, requiredRole, requiredFeature, requiredFeatures = [] }) {

    const { user, loading } = useAuth();

    if (loading) {

        return <div className='h-screen bg-gray-900 text-white flex justify-left'>

  </div>;

    }

    if (!user) {

        return <Navigate to="/login" replace />;

    }

    if (!canAccessRequiredRole(user.role, requiredRole)) {
        return <Navigate to="/" replace />;
    }

    const features = new Set(user.features || []);
    const neededFeatures = requiredFeature ? [requiredFeature, ...requiredFeatures] : requiredFeatures;
    if (neededFeatures.some(feature => !features.has(feature))) {
        return <Navigate to="/" replace />;
    }

    return children;
}
