import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { connectFileChangeEvents } from "../../shared/api/file-change-client.js";
import { AuthContext } from "./AuthContext.js";

// Bei Reload credencials überprüfen und User setzen, falls vorhanden
// Log out bei fehlendem cookie oder fehlender Session


export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);

    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {

        setLoading(true);

        try {

            const response = await axios.get(
                "/api/auth/me",
                {
                    withCredentials: true,
                }
            );

            setUser(response.data);
            

        } catch {

            setUser(null);

        } finally {

            setLoading(false);
            

        }

    }, []);

    useEffect(() => {
        let active = true;

        const loadCurrentUser = async () => {
            try {
                const response = await axios.get("/api/auth/me", { withCredentials: true });
                if (active) setUser(response.data);
            } catch {
                if (active) setUser(null);
            } finally {
                if (active) setLoading(false);
            }
        };

        void loadCurrentUser();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!user) return undefined;
        return connectFileChangeEvents();
    }, [user]);

    return (
        <AuthContext.Provider value={{
            user,
            setUser,
            loading,
            checkAuth
        }}>
            {children}
        </AuthContext.Provider>
    );
};
