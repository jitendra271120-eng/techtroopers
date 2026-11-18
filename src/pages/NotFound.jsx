import { Link } from 'react-router-dom';
export default function NotFound(){return <main className="page-center"><div className="text-center"><div className="display-1 fw-bold text-primary">404</div><h2>Page not found</h2><p className="text-muted">The requested Techtroopers page does not exist.</p><Link to="/" className="btn btn-primary">Go Home</Link></div></main>}
