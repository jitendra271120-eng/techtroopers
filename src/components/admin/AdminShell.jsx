import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const links = [
  ['/admin', 'bi-grid-1x2-fill', 'Dashboard'],
  ['/admin/exams', 'bi-journal-check', 'Exam Manager'],
  ['/admin/questions', 'bi-patch-question-fill', 'Question Bank'],
  ['/admin/answer-key', 'bi-key-fill', 'Answer Key'],
  ['/admin/results', 'bi-clipboard-data-fill', 'Exam Results'],
  ['/admin/all-scores', 'bi-bar-chart-fill', 'All User Scores'],
  ['/admin/tier-students', 'bi-trophy-fill', 'Tier Students'],
  ['/admin/users', 'bi-people-fill', 'Registered Users'],
  ['/admin/ebooks', 'bi-book-half', 'E-Books & Notes'],
  ['/admin/roadmaps', 'bi-signpost-split-fill', 'Road Maps'],
  ['/admin/vacancies', 'bi-briefcase-fill', 'Vacancies'],
  ['/admin/troopers-talk', 'bi-chat-square-text-fill', 'TroopersTalk'],
  ['/admin/portfolio', 'bi-kanban-fill', 'Portfolio'],
  ['/admin/data', 'bi-database-fill', 'Firebase Data'],
  ['/admin/rooms', 'bi-controller', 'Tech Snake Rooms'],
  ['/admin/console', 'bi-layout-text-window-reverse', 'All-in-one Console'],
];

export default function AdminShell({ title, subtitle, children, actions }) {
  const { user, logout } = useAuth();
  return (
    <div className="tt-admin-page">
      <aside className="tt-admin-sidebar">
        <Link to="/" className="tt-admin-brand">
          <img src="/logo.png" alt="Techtroopers" />
          <div><b>TechTroopers</b><span>Admin Portal</span></div>
        </Link>
        <nav>
          {links.map(([to, icon, label]) => (
            <NavLink key={to} to={to} end={to === '/admin'} className={({isActive}) => isActive ? 'active' : ''}>
              <i className={`bi ${icon}`} /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="tt-admin-main">
        <header className="tt-admin-topbar">
          <div>
            <span className="tt-admin-kicker">TECHTROOPERS LMS</span>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="tt-admin-top-actions">
            {actions}
            <Link className="btn btn-light border btn-sm" to="/">View Website</Link>
            <div className="tt-admin-user">
              <span>{(user?.name || user?.email || 'A').slice(0, 1).toUpperCase()}</span>
              <div><b>{user?.name || 'Administrator'}</b><small>{user?.email}</small></div>
            </div>
            <button className="btn btn-outline-danger btn-sm" onClick={logout}>Logout</button>
          </div>
        </header>
        <main className="tt-admin-content">{children}</main>
      </section>
    </div>
  );
}

export function AdminNotice({ error, loading }) {
  if (loading) return <div className="alert alert-info py-2">Loading Firebase data…</div>;
  if (error) return <div className="alert alert-warning py-2"><b>Firebase:</b> {error}</div>;
  return null;
}

export function EmptyRow({ colSpan = 8, text = 'No records found.' }) {
  return <tr><td colSpan={colSpan} className="text-center text-muted py-4">{text}</td></tr>;
}
