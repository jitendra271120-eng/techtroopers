import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function AuthModal({ mode, onClose, onSwitch }) {
  const { login, register, loginGoogle } = useAuth();
  const [form, setForm] = useState({ name:'', email: mode === 'login' ? 'student@techtroopers.in' : '', password: mode === 'login' ? '123456' : '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { const f=e=>e.key==='Escape'&&onClose(); document.addEventListener('keydown',f); document.body.style.overflow='hidden'; return()=>{document.removeEventListener('keydown',f);document.body.style.overflow='';}; }, [onClose]);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { mode==='login' ? await login(form.email, form.password) : await register(form); toast.success(mode==='login'?'Logged in successfully':'Account created'); onClose(); }
    catch(err){ toast.error(err.message); }
    finally { setBusy(false); }
  };
  return <div className="auth-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <div className="auth-card">
      <button className="icon-close" onClick={onClose}>×</button>
      <span className="eyebrow">Techtroopers Account</span>
      <h2>{mode==='login'?'Welcome back':'Create your account'}</h2>
      <p>{mode==='login'?'Access your exams, resources and projects.':'Join the learning room, exam hall and project board.'}</p>
      <form onSubmit={submit} className="vstack gap-3 mt-4">
        {mode==='register' && <div><label className="form-label">Full name</label><input className="form-control" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>}
        <div><label className="form-label">Email</label><input className="form-control" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
        <div><label className="form-label">Password</label><input className="form-control" type="password" minLength="6" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></div>
        <button className="btn btn-primary tt-btn" disabled={busy}>{busy?'Please wait...':mode==='login'?'Log in':'Register'}</button>
      </form>
      <button className="btn btn-light border w-100 mt-3" onClick={async()=>{try{await loginGoogle();onClose();}catch(e){toast.error(e.message)}}}>Continue with Google</button>
      <div className="auth-demo mt-3"><strong>Demo:</strong> student@techtroopers.in / 123456<br/>Admin: admin@techtroopers.in / 123456</div>
      <p className="text-center mt-3 mb-0">{mode==='login'?'New to Techtroopers?':'Already registered?'} <button className="link-button" onClick={()=>onSwitch(mode==='login'?'register':'login')}>{mode==='login'?'Register':'Log in'}</button></p>
    </div>
  </div>;
}
