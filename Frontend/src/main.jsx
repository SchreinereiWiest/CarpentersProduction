import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter, Routes, Route } from "react-router";

import { AuthProvider } from "./routes/AuthContext";

import ProtectedRoute from "./routes/ProtectedRoute";
import PublicRoute from "./routes/PublicRoute";

import HomeAdmin from "./pages/admin/home.admin";
import ContactsAdmin from "./pages/admin/contacts/contacts.admin.jsx";
import ContactsNewAdmin from "./pages/admin/contacts/newcontact.admin.jsx";
import ShowContactsAdmin from "./pages/admin/contacts/showcontact.admin.jsx";
import EditContactsAdmin from "./pages/admin/contacts/editcontact.admin.jsx";
import NewProject from "./pages/admin/projects/newproject.admin.jsx";
import ShowProject from "./pages/admin/projects/home.project.jsx";
import Login from "./pages/public/Login";
import CadViewer from "./pages/admin/projects/cad/cad.project.jsx";
import ListMaterial from "./pages/admin/projects/list/list.project.jsx";

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

          <Route path="/Projects/:projectId" element={ <ProtectedRoute>
            <ShowProject />
            </ProtectedRoute>
            }
            />

            <Route path="/Projects/CAD/:projectId" element={ <ProtectedRoute>
            <CadViewer />
            </ProtectedRoute>
            }
            />

            <Route path="/Projects/List/:projectId" element={ <ProtectedRoute>
            <ListMaterial />
            </ProtectedRoute>
            }
            />

            // Admin routes for contacts

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

          <Route path="/Kontakte/info/:userid" element={ <ProtectedRoute requiredRole="admin">
            <ShowContactsAdmin />
            </ProtectedRoute>
            }
            />

            <Route path="/Kontakte/edit/:userid" element={ <ProtectedRoute requiredRole="admin">
            <EditContactsAdmin />
            </ProtectedRoute>
            }
            />

            <Route path="/Kontakte/NewProject/:userid" element={ <ProtectedRoute requiredRole="admin">
            <NewProject />
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