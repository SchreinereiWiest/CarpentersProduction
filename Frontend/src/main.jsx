import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter, Routes, Route } from "react-router";

import { AuthProvider } from "./routes/AuthContext";

import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";

import App from "./App";
import Login from "./pages/public/Login";

import './index.css'

import {
createContext,
useState,
} from "react";

const root = document.getElementById("root");

export const AppContext = createContext();

export const AppProvider = ({ children }) => {

const [projectRoute, setProjectRoute] =
useState("/");

return (
<AppContext.Provider value={{
        projectRoute,
        setProjectRoute,
      }}>
  {children}
</AppContext.Provider>
);
};

ReactDOM.createRoot(root).render(

<React.StrictMode>

  <AppProvider>

    <AuthProvider>

    <BrowserRouter>

        <Routes>

            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />

            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <App />
                    </ProtectedRoute>
                }
            />

        </Routes>

    </BrowserRouter>

</AuthProvider>

  </AppProvider>

</React.StrictMode>
);