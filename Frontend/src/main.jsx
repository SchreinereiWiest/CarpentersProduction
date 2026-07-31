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
import NestingView from "./pages/admin/projects/nesting/nesting.project.jsx";
import CutingView from "./pages/admin/projects/cut/cut.project.jsx";
import ProjectOverview from "./pages/admin/projects/overview.project.jsx";
import ShowStorage from "./pages/admin/storage/home.storage.jsx";
import TimeTracking from "./pages/admin/projects/timetracking/timeTracking.project.jsx";
import CreateProject from "./pages/admin/projects/edit/create.project.jsx";
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

            <Route path="/Projects" element={ <ProtectedRoute requiredRole="user">
            <ProjectOverview/>
            </ProtectedRoute>
            }
            />

            <Route path="/Projects/:projectId" element={ <ProtectedRoute requiredRole="user">
            <ShowProject />
            </ProtectedRoute>
            }
            />

            <Route path="/Projects/CAD/:projectId" element={ <ProtectedRoute requiredRole="user">
            <CadViewer />
            </ProtectedRoute>
            }
            />

            <Route path="/Projects/List/:projectId" element={ <ProtectedRoute requiredRole="user">
            <ListMaterial />
            </ProtectedRoute>
            }
            />

            <Route path="/Projects/Nesting/:projectId" element={ <ProtectedRoute requiredRole="user">
            <NestingView />
            </ProtectedRoute>
            }
            />

            <Route path="/Projects/Cut/:projectId" element={ <ProtectedRoute requiredRole="user">
            <CutingView/>
            </ProtectedRoute>
            }
            />

            <Route path="/Projects/Time/:projectId" element={ <ProtectedRoute requiredRole="user">
            <TimeTracking/>
            </ProtectedRoute>
            }
            />

            <Route path="/Projects/Create" element={ <ProtectedRoute requiredRole="user">
            <CreateProject/>
            </ProtectedRoute>
            }
            />

            <Route path="/Storage" element={ <ProtectedRoute requiredRole="user">
            <ShowStorage/>
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