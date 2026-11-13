import { useCallback, useEffect, useMemo, useState } from "react";

import { ThemeContext } from "./ThemeContext.js";
import {
    applyTheme,
    getStoredTheme,
    normalizeTheme,
    persistTheme,
    THEME_STORAGE_KEY
} from "./theme.js";

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(getStoredTheme);

    const setTheme = useCallback(nextTheme => {
        setThemeState(persistTheme(nextTheme));
    }, []);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    useEffect(() => {
        const syncTheme = event => {
            if (event.key !== THEME_STORAGE_KEY) return;
            setThemeState(normalizeTheme(event.newValue));
        };
        window.addEventListener("storage", syncTheme);
        return () => window.removeEventListener("storage", syncTheme);
    }, []);

    const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
