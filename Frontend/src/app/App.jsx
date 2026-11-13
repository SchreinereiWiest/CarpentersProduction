import { BrowserRouter } from "react-router";

import { AppProvider } from "./providers/AppProvider.jsx";
import { AuthProvider } from "./providers/AuthProvider.jsx";
import { ThemeProvider } from "./theme/ThemeProvider.jsx";
import AppRouter from "./router.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </AuthProvider>
      </AppProvider>
    </ThemeProvider>
  );
}
