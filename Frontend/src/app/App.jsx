import { BrowserRouter } from "react-router";

import { AppProvider } from "./providers/AppProvider.jsx";
import { AuthProvider } from "./providers/AuthProvider.jsx";
import AppRouter from "./router.jsx";

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </AppProvider>
  );
}
