import { useOutletContext } from 'react-router';

/** Liest den vom ManagementLayout bereitgestellten Outlet-Kontext für die aktuelle Unterseite. */
export function useManagement() { return useOutletContext(); }
