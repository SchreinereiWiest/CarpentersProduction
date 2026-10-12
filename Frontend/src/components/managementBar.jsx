import { NavLink } from 'react-router';
import { SETUP_STEPS } from '../../../shared/managementSetup.mjs';

const icons = [
  'M3 21V7l9-4 9 4v14 M8 21v-7h8v7 M7 9h1 M16 9h1',
  'M3 10h18 M4 20h16 M6 10v10 M12 10v10 M18 10v10 M3 7l9-4 9 4v3H3z',
  'M7 3h10v18H7z M10 7h4 M10 11h4 M10 15h4',
  'M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M4 21v-3a8 8 0 0 1 16 0v3',
  'M12 3v6 M4 21v-7h16v7 M4 14v-5h16v5 M12 14v7',
  'M4 8h16v12H4z M8 8V4h8v4 M8 12h8 M8 16h3 M17 16h1',
  'M3 4h18v16H3z M3 9h18 M9 4v16 M15 9v11 M3 15h18',
  'M4 12l5 5L20 6',
];
const operating = [
  ['', 'Betriebsübersicht', icons[0]], ['Hours', 'Stunden & Produktivität', icons[3]],
  ['Costs', 'Kostenstellen & Vergleich', icons[6]],
];
export default function ManagementBar({ setupMode = false }) {
  const sections = setupMode ? SETUP_STEPS.map(([path, label], index) => [`Setup/${path}`, label, icons[index]]) : operating;
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
