import { NavLink } from 'react-router';
import { OPERATING_NAVIGATION } from '../defaults/navigation.defaults.js';

/** Zeigt die fünf operativen Managementbereiche mit ihren SVG-Symbolen. */
export default function ManagementBar() {
  return <nav aria-label="Managementbereiche" className="shrink-0 overflow-x-auto border-b border-gray-700 bg-gray-800">
    <div className="flex min-w-max gap-2 p-2 xl:p-3">
      {OPERATING_NAVIGATION.map(([path, label, icon]) => <NavLink key={path} to={`/Management${path ? `/${path}` : ''}`} end={!path} title={label}
        className={({ isActive }) => `flex min-h-14 items-center gap-2 rounded-lg px-3 text-sm ${isActive ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-5 shrink-0"><path d={icon}/></svg>
        <span>{label}</span>
      </NavLink>)}
    </div>
  </nav>;
}
