import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import CacheRefreshBoundary from "../../src/components/offline/CacheRefreshBoundary.jsx";
import { MANUAL_CACHE_REFRESH_COMPLETE_EVENT } from "../../src/services/cacheEvents.js";

function StatefulPage() {
    const [value, setValue] = useState(0);
    return (
        <button type="button" onClick={() => setValue(current => current + 1)}>
            Zustand {value}
        </button>
    );
}

describe("CacheRefreshBoundary", () => {
    it("initialisiert den Zustand der geöffneten Seite nach dem Cache-Refresh neu", () => {
        render(
            <CacheRefreshBoundary>
                <StatefulPage />
            </CacheRefreshBoundary>
        );

        fireEvent.click(screen.getByRole("button"));
        expect(screen.getByText("Zustand 1")).toBeInTheDocument();

        act(() => {
            window.dispatchEvent(new CustomEvent(MANUAL_CACHE_REFRESH_COMPLETE_EVENT));
        });

        expect(screen.getByText("Zustand 0")).toBeInTheDocument();
    });
});
