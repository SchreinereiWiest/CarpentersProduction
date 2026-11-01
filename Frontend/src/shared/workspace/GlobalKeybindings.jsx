import { useEffect } from "react";

import {
    focusNavigation,
    isEditableTarget,
    matchesKeybinding,
    triggerApplyAction
} from "./keybindings.js";
import { isWorkspacePane } from "./workspace-settings.js";

export default function GlobalKeybindings({ keybindings, activeFrameRef, children }) {
    useEffect(() => {
        const execute = action => {
            if (action === "apply") {
                if (activeFrameRef?.current) {
                    activeFrameRef.current.contentWindow?.postMessage({
                        type: "carpenters-workspace-keybinding",
                        action
                    }, window.location.origin);
                    return true;
                }
                return triggerApplyAction();
            }

            const target = action === "sidebar" ? "sidebar" : "project-bar";
            if (focusNavigation(target)) return true;

            if (isWorkspacePane() && window.parent !== window) {
                window.parent.postMessage({
                    type: "carpenters-workspace-keybinding",
                    action
                }, window.location.origin);
                return true;
            }
            return false;
        };

        const handleKeyDown = event => {
            const action = ["sidebar", "projectBar", "apply"].find(candidate =>
                matchesKeybinding(event, keybindings?.[candidate])
            );
            if (!action) return;

            if (isEditableTarget(event.target)
                && !event.ctrlKey && !event.altKey && !event.metaKey) return;

            if (execute(action === "projectBar" ? "projectBar" : action)) {
                event.preventDefault();
            }
        };

        const handleMessage = event => {
            if (event.origin !== window.location.origin
                || event.data?.type !== "carpenters-workspace-keybinding") return;
            execute(event.data.action);
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("message", handleMessage);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("message", handleMessage);
        };
    }, [activeFrameRef, keybindings]);

    return children;
}
