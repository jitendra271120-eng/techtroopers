import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar({ openAuth }) {
  const [open, setOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const navClass = ({isActive}) => `nav-link ${isActive?'active':''}`;
  return <header className="tt-nav-wrap"><nav className="tt-nav container-xxl">
    <Link className="brand" to="/"><img src="/logohead.png" className="brand-logo" alt="Techtroopers"/></Link>
    <button className="nav-toggle" onClick={()=>setOpen(!open)}><i className="bi bi-list"/></button>
    <div className={`nav-menu ${open?'open':''}`} onClick={()=>setOpen(false)}>
      <NavLink className={navClass} to="/">Home</NavLink>
      <NavLink className={navClass} to="/ebooks">E-Books</NavLink>
      <NavLink className={navClass} to="/exams">Exams</NavLink>
      <NavLink className={navClass} to="/roadmaps">Road Maps</NavLink>
      <NavLink className={navClass} to="/talk">TroopersTalk</NavLink>
      <NavLink className={navClass} to="/portfolio">TroopersHub</NavLink>
      <NavLink className={navClass} to="/vacancies">Vacancies</NavLink>
      <NavLink className={navClass} to="/resume-builder">Resume</NavLink>
    </div>
    <div className="nav-actions">
      {!user ? <><button className="btn btn-sm btn-light border" onClick={()=>openAuth('login')}>Login</button><button className="btn btn-sm btn-primary" onClick={()=>openAuth('register')}>Join</button></> : <div className="dropdown">
        <button className="profile-chip dropdown-toggle" data-bs-toggle="dropdown"><span>{(user.name||'U').slice(0,2).toUpperCase()}</span><b>{user.name}</b></button>
        <ul className="dropdown-menu dropdown-menu-end shadow-sm">
          <li><Link className="dropdown-item" to="/dashboard">Dashboard</Link></li>
          {isAdmin && <li><Link className="dropdown-item" to="/admin">Admin Console</Link></li>}
          <li><hr className="dropdown-divider"/></li>
          <li><button className="dropdown-item text-danger" onClick={logout}>Logout</button></li>
        </ul>
      </div>}
    </div>
  </nav></header>;
}
