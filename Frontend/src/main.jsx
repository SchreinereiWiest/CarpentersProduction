import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter, Routes, Route } from "react-router";

import { AuthProvider } from "./routes/AuthContext";

import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";

import HomeAdmin from "./pages/admin/home.admin";
import ContactsAdmin from "./pages/admin/contacts.admin.jsx";
import ContactsNewAdmin from "./pages/admin/newcontact.admin.jsx";
import ShowContactsAdmin from "./pages/admin/showcontact.admin.jsx";
import Login from "./pages/public/Login";

import './index.css'

import {
createContext,
useState,
useContext
} from "react";

const root = document.getElementById("root");

export const AppContext = createContext();

export const AppProvider = ({ children }) => {

const [projectRoute, setProjectRoute] = useState("/");

const [SideBarCollapsed, setSideBarCollapsed] = useState(true);

return (
<AppContext.Provider value={{
        projectRoute,
        setProjectRoute,
        SideBarCollapsed,
        setSideBarCollapsed
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

          <Route path="/login" element={ <PublicRoute>
            <Login />
            </PublicRoute>
            }
            />

          <Route path="/" element={ <ProtectedRoute>
            <HomeAdmin />
            </ProtectedRoute>
            }
            />

          <Route path="/Kontakte" element={ <ProtectedRoute requiredRole="admin">
            <ContactsAdmin />
            </ProtectedRoute>
            }
            />

          <Route path="/Kontakte/new" element={ <ProtectedRoute requiredRole="admin">
            <ContactsNewAdmin />
            </ProtectedRoute>
            }
            />

          <Route path="/Kontakte/info/:id" element={ <ProtectedRoute requiredRole="admin">
            <ShowContactsAdmin />
            </ProtectedRoute>
            }
            />

        </Routes>

      </BrowserRouter>

    </AuthProvider>

  </AppProvider>

</React.StrictMode>
);

export const useApp = () => useContext(AppContext);