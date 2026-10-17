import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app/App.jsx";
import { registerServiceWorker } from "./app/registerServiceWorker.js";
import { installNetworkClient } from "./shared/api/http-client.js";
import { installS3CacheRefresh } from "./shared/cache/cache-refresh.js";
import { installCacheCleanup } from "./shared/cache/cache-retention.js";
import "./index.css";

installNetworkClient();
installS3CacheRefresh();
installCacheCleanup();
registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
