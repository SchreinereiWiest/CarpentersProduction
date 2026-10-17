import axios from "axios";

export async function loadLicense({ refresh = false } = {}) {
    const response = await axios.get("/api/license/current", {
        withCredentials: true,
        params: refresh ? { refresh: true } : undefined
    });
    return response.data;
}

export async function activateLicense(licenseKey) {
    const response = await axios.put(
        "/api/license/current",
        { licenseKey },
        { withCredentials: true }
    );
    return response.data;
}
