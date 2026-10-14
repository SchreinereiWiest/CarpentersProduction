import { Fragment, useEffect, useState } from "react";
import { MANUAL_CACHE_REFRESH_COMPLETE_EVENT } from "../../services/cacheEvents.js";

/** Hängt nur den aktuellen Seitenbaum nach einem manuellen Cache-Refresh neu ein. */
export default function CacheRefreshBoundary({ children }) {
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        const refreshPageState = () => setRevision(current => current + 1);
        window.addEventListener(MANUAL_CACHE_REFRESH_COMPLETE_EVENT, refreshPageState);
        return () => window.removeEventListener(MANUAL_CACHE_REFRESH_COMPLETE_EVENT, refreshPageState);
    }, []);

    return <Fragment key={revision}>{children}</Fragment>;
}
