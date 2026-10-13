import { NavLink } from 'react-router';
import { OPERATING_NAVIGATION, SETUP_NAVIGATION } from '../defaults/navigation.defaults.js';
import { UI_DEFAULTS } from '../defaults/ui.defaults.js';

/** Zeigt entweder acht Einrichtungsschritte oder die drei freigegebenen Jahresbereiche mit ihren SVG-Symbolen. */
export default function ManagementBar({ setupMode = UI_DEFAULTS.setupMode }) {
  const sections = setupMode ? SETUP_NAVIGATION : OPERATING_NAVIGATION;
  return <nav aria-label={setupMode ? 'Betrieb einrichten' : 'Managementbereiche'} className="shrink-0 overflow-x-auto border-b border-gray-700 bg-gray-800">
    <div className="flex min-w-max gap-2 p-2 xl:p-3">
      {sections.map(([path, label, icon], index) => <NavLink key={path} to={`/Management${path ? `/${path}` : ''}`} end={!path} title={label}
        className={({ isActive }) => `flex min-h-14 items-center gap-2 rounded-lg px-3 text-sm ${isActive ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
        {setupMode ? <span className="text-xs font-semibold text-blue-400">{String(index + 1).padStart(2, '0')}</span> : null}
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0"><path d={icon}/></svg>
        <span>{label}</span>
      </NavLink>)}
    </div>
  </nav>;
}
