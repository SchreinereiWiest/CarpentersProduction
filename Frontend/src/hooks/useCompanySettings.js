import { useEffect, useState } from "react";

import {
    DEFAULT_COMPANY_SETTINGS,
    loadCompanySettings
} from "../services/companySettings.js";

export default function useCompanySettings() {
    const [settings, setSettings] = useState(DEFAULT_COMPANY_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        loadCompanySettings()
            .then(data => {
                if (mounted) setSettings(data);
            })
            .catch(error => {
                console.warn("Unternehmenseinstellungen konnten nicht geladen werden:", error);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, []);

    return { settings, loading };
}
