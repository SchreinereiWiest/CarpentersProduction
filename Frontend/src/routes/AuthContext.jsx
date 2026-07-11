import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

// Bei Reload credencials überprüfen und User setzen, falls vorhanden
// Log out bei fehlendem cookie oder fehlender Session


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {

        checkAuth();

    }, []);

    const checkAuth = async () => {

        setLoading(true);

        try {

            const response = await axios.get(
                "/api/auth/me",
                {
                    withCredentials: true,
                }
            );

            setUser(response.data);
            

        } catch (error) {

            setUser(null);

        } finally {

            setLoading(false);
            

        }

    };

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