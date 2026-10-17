import { useMemo, useState } from "react";

import { AppContext } from "./AppContext.js";

export function AppProvider({ children }) {
  const [projectRoute, setProjectRoute] = useState("/");
  const [SideBarCollapsed, setSideBarCollapsed] = useState(true);
  const value = useMemo(() => ({
    projectRoute,
    setProjectRoute,
    SideBarCollapsed,
    setSideBarCollapsed
  }), [projectRoute, SideBarCollapsed]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
