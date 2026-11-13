import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import SideBar from "../components/sideBar.jsx";
import { loadCompanySettings } from "../settings/company-settings.js";
import GlobalKeybindings from "./GlobalKeybindings.jsx";
import {
    getStoredWorkspacePreferences,
    isWorkspacePane,
    persistWorkspacePreferences,
    WORKSPACE_PREFERENCES_EVENT,
    WORKSPACE_PREFERENCES_STORAGE_KEY
} from "./workspace-settings.js";

const LARGE_WORKSPACE_QUERY = "(min-width: 1280px)";

function paneCount(layout) {
    if (layout === "grid") return 4;
    if (layout === "split") return 2;
    return 1;
}

function sideBarSelection(path) {
    if (path.startsWith("/Management")) return 1;
    if (path.startsWith("/Projects")) return 2;
    if (path.startsWith("/Documents")) return 3;
    if (path.startsWith("/Calendar")) return 4;
    if (path.startsWith("/Kontakte")) return 5;
    if (path.startsWith("/Storage")) return 6;
    if (path.startsWith("/Mitarbeiter")) return 7;
    if (path.startsWith("/CompanySettings")) return 8;
    if (path.startsWith("/User")) return 9;
    if (path.startsWith("/Purchasing")) return 10;
    return 0;
}

function paneSource(path) {
    const url = new URL(path, window.location.origin);
    url.searchParams.set("workspacePane", "1");
    return `${url.pathname}${url.search}${url.hash}`;
}

function useLargeWorkspace() {
    const [matches, setMatches] = useState(() =>
        typeof window !== "undefined" && window.matchMedia(LARGE_WORKSPACE_QUERY).matches
    );

    useEffect(() => {
        const media = window.matchMedia(LARGE_WORKSPACE_QUERY);
        const update = event => setMatches(event.matches);
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, []);

    return matches;
}

export function ScaledWorkspace({ children, scalePercent }) {
    if (scalePercent === 100) return children;

    const scaleStyle = getWorkspaceScaleStyle(scalePercent);

    return (
        <div className="workspace-scale-viewport">
            <div className="workspace-scale-content" style={scaleStyle}>
                {children}
            </div>
        </div>
    );
}

export function getWorkspaceScaleStyle(scalePercent) {
    const scale = scalePercent / 100;
    const inverseScale = 1 / scale;

    return {
        "--workspace-scale": scale,
        "--workspace-scaled-viewport-height": `${100 * inverseScale}dvh`,
        width: `${100 * inverseScale}%`,
        height: `${100 * inverseScale}%`,
        transform: `scale(${scale})`
    };
}

export default function WorkspaceRoot({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const paneMode = isWorkspacePane();
    const largeWorkspace = useLargeWorkspace();
    const currentRoute = `${location.pathname}${location.search}${location.hash}`;
    const settingsLoaded = useRef(false);
    const [preferences, setPreferences] = useState(getStoredWorkspacePreferences);
    const [activePane, setActivePane] = useState(0);
    const [panes, setPanes] = useState(() => Array.from({
        length: paneCount(getStoredWorkspacePreferences().workspaceLayout)
    }, (_, index) => index === 0 ? currentRoute : null));
    const [paneRoutes, setPaneRoutes] = useState(() => Array.from({
        length: paneCount(getStoredWorkspacePreferences().workspaceLayout)
    }, (_, index) => index === 0 ? currentRoute : null));
    const frameRefs = useRef([]);
    const readyFrames = useRef([]);
    const activeFrameRef = useRef(null);

    useEffect(() => {
        const applyPreferences = next => {
            const count = paneCount(next.workspaceLayout);
            setPreferences(next);
            setPanes(previous => Array.from({ length: count }, (_, index) =>
                previous[index] ?? (index === 0 ? currentRoute : null)
            ));
            setPaneRoutes(previous => Array.from({ length: count }, (_, index) =>
                previous[index] ?? (index === 0 ? currentRoute : null)
            ));
            setActivePane(previous => Math.min(previous, count - 1));
        };
        const update = event => applyPreferences(
            event.detail || getStoredWorkspacePreferences()
        );
        const updateFromStorage = event => {
            if (event.key === WORKSPACE_PREFERENCES_STORAGE_KEY) {
                applyPreferences(getStoredWorkspacePreferences());
            }
        };
        window.addEventListener(WORKSPACE_PREFERENCES_EVENT, update);
        window.addEventListener("storage", updateFromStorage);
        return () => {
            window.removeEventListener(WORKSPACE_PREFERENCES_EVENT, update);
            window.removeEventListener("storage", updateFromStorage);
        };
    }, [currentRoute]);

    useEffect(() => {
        if (paneMode) {
            const route = new URL(currentRoute, window.location.origin);
            route.searchParams.delete("workspacePane");
            window.parent.postMessage({
                type: "carpenters-workspace-pane-route",
                route: `${route.pathname}${route.search}${route.hash}`
            }, window.location.origin);

            const activate = () => window.parent.postMessage({
                type: "carpenters-workspace-pane-activate"
            }, window.location.origin);
            const handleNavigation = event => {
                if (event.origin !== window.location.origin
                    || event.data?.type !== "carpenters-workspace-navigate"
                    || !event.data.path) return;
                navigate(event.data.path);
            };
            window.addEventListener("pointerdown", activate, true);
            window.addEventListener("message", handleNavigation);
            return () => {
                window.removeEventListener("pointerdown", activate, true);
                window.removeEventListener("message", handleNavigation);
            };
        }

        const handlePaneMessage = event => {
            if (event.origin !== window.location.origin) return;
            const index = frameRefs.current.findIndex(frame => frame?.contentWindow === event.source);
            if (index < 0) return;

            if (event.data?.type === "carpenters-workspace-pane-activate") {
                setActivePane(index);
            }
            if (event.data?.type === "carpenters-workspace-pane-route" && event.data.route) {
                setPaneRoutes(previous => previous.map((path, paneIndex) =>
                    paneIndex === index ? event.data.route : path
                ));
            }
        };
        window.addEventListener("message", handlePaneMessage);
        return () => window.removeEventListener("message", handlePaneMessage);
    }, [currentRoute, navigate, paneMode]);

    useEffect(() => {
        if (paneMode || location.pathname === "/login" || settingsLoaded.current) return undefined;
        settingsLoaded.current = true;
        let active = true;
        loadCompanySettings()
            .then(settings => {
                if (!active) return;
                persistWorkspacePreferences(settings.userInterface);
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, [location.pathname, paneMode]);

    useEffect(() => {
        activeFrameRef.current = frameRefs.current[activePane] ?? null;
    }, [activePane, panes]);

    const activeRoute = paneRoutes[activePane] || currentRoute;
    const openInActivePane = useCallback(path => {
        const frame = frameRefs.current[activePane];
        if (frame && readyFrames.current[activePane]) {
            frame.contentWindow?.postMessage({
                type: "carpenters-workspace-navigate",
                path
            }, window.location.origin);
        } else {
            readyFrames.current[activePane] = false;
            setPanes(previous => previous.map((entry, index) =>
                index === activePane ? path : entry
            ));
        }
        setPaneRoutes(previous => previous.map((entry, index) =>
            index === activePane ? path : entry
        ));
        navigate(path);
    }, [activePane, navigate]);

    useEffect(() => {
        if (paneMode) return undefined;
        const handleGlobalNavigation = event => {
            const path = event.detail?.path;
            if (typeof path === "string" && path.startsWith("/")) openInActivePane(path);
        };
        window.addEventListener("carpenters-global-navigate", handleGlobalNavigation);
        return () => window.removeEventListener("carpenters-global-navigate", handleGlobalNavigation);
    }, [openInActivePane, paneMode]);

    if (paneMode) {
        return (
            <GlobalKeybindings keybindings={preferences.keybindings}>
                {children}
            </GlobalKeybindings>
        );
    }

    if (preferences.workspaceLayout === "single"
        || !largeWorkspace || location.pathname === "/login") {
        const scaleContent = largeWorkspace && location.pathname !== "/login";
        return (
            <GlobalKeybindings keybindings={preferences.keybindings}>
                {scaleContent ? (
                    <ScaledWorkspace scalePercent={preferences.workspaceScalePercent}>
                        {children}
                    </ScaledWorkspace>
                ) : children}
            </GlobalKeybindings>
        );
    }

    const gridClass = preferences.workspaceLayout === "grid"
        ? "workspace-grid--quad"
        : "workspace-grid--split";

    return (
        <GlobalKeybindings
            keybindings={preferences.keybindings}
            activeFrameRef={activeFrameRef}
        >
            <div className="flex h-dvh w-full overflow-hidden bg-gray-900 text-white">
                <SideBar
                    selected={sideBarSelection(activeRoute)}
                    onNavigate={openInActivePane}
                />
                <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <div className={`workspace-grid ${gridClass}`}>
                        {panes.map((path, index) => {
                            const active = index === activePane;
                            return (
                                <section
                                    key={index}
                                    className={`workspace-pane ${active ? "workspace-pane--active" : ""}`}
                                    onPointerDown={() => setActivePane(index)}
                                    aria-label={`Arbeitsfeld ${index + 1}${active ? ", aktiv" : ""}`}
                                >
                                    {path ? (
                                        <iframe
                                            ref={node => {
                                                frameRefs.current[index] = node;
                                                if (active) activeFrameRef.current = node;
                                            }}
                                            onLoad={() => {
                                                readyFrames.current[index] = true;
                                            }}
                                            src={paneSource(path)}
                                            title={`Arbeitsfeld ${index + 1}`}
                                            className="workspace-pane__frame"
                                            style={preferences.workspaceScalePercent === 100
                                                ? undefined
                                                : getWorkspaceScaleStyle(preferences.workspaceScalePercent)
                                            }
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            className="workspace-pane__empty"
                                            onClick={() => setActivePane(index)}
                                        >
                                            <span className="workspace-pane__empty-icon" aria-hidden="true">+</span>
                                            <span className="font-semibold">Feld aktivieren</span>
                                            <span className="text-xs text-gray-500">
                                                Danach ein Ziel in der Sidebar wählen.
                                            </span>
                                        </button>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                </main>
            </div>
        </GlobalKeybindings>
    );
}
