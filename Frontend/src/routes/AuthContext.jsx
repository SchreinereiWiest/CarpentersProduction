import { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { connectFileChangeEvents } from "../services/fileChangeClient.js";

// Bei Reload credencials überprüfen und User setzen, falls vorhanden
// Log out bei fehlendem cookie oder fehlender Session


const AuthContext = createContext();

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

        checkAuth();

    }, [checkAuth]);

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

export const useAuth = () => useContext(AuthContext);
