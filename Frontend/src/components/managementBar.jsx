import { NavLink } from 'react-router';

const sections = [
  ['', 'Übersicht', 'M3 13h5v8H3z M10 3h5v18h-5z M17 8h4v13h-4z'],
  ['Transactions', 'Belege & Geschäftsvorfälle', 'M7 3h8l4 4v14H5V3h2 M14 3v5h5 M8 12h8 M8 16h6'],
  ['CostAccounting', 'Kostenrechnung', 'M3 4h18v16H3z M3 9h18 M9 4v16 M15 9v11 M3 15h18'],
  ['Calculation', 'Kalkulationsgrundlagen', 'M6 3h12v18H6z M9 7h6 M9 11h1 M14 11h1 M9 15h1 M14 15h1 M9 18h1 M14 18h1'],
  ['Assets', 'Vermögen & Finanzierung', 'M3 10h18 M4 20h16 M6 10v10 M12 10v10 M18 10v10 M3 7l9-4 9 4v3H3z'],
  ['Settings', 'Einstellungen', 'M4 7h16 M4 17h16 M8 4v6 M16 14v6'],
];

export default function ManagementBar() {
  return <nav aria-label="Managementbereiche" className="shrink-0 overflow-x-auto border-b border-gray-700 bg-gray-800">
    <div className="flex min-w-max gap-2 p-2 xl:p-3">
      {sections.map(([path, label, icon]) => <NavLink key={path} to={`/Management${path ? `/${path}` : ''}`} end={!path} title={label}
        className={({ isActive }) => `flex min-h-12 items-center gap-2 rounded-lg px-3 text-sm xl:min-h-14 ${isActive ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="size-6 shrink-0"><path d={icon}/></svg>
        <span>{label}</span>
      </NavLink>)}
    </div>
  </nav>;
}
