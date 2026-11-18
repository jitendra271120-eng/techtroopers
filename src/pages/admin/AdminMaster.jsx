import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminShell from '../../components/admin/AdminShell';
import { listCollection } from '../../services/firestoreService';

const modules = [
  { key:'users', label:'Registered Users', icon:'bi-people-fill', path:'/admin/users' },
  { key:'categories', label:'Exams', icon:'bi-journal-check', path:'/admin/exams' },
  { key:'questions', label:'Questions', icon:'bi-patch-question-fill', path:'/admin/questions' },
  { key:'scores', label:'Results', icon:'bi-clipboard-data-fill', path:'/admin/results' },
  { key:'BookFile', label:'E-Books / Notes', icon:'bi-book-half', path:'/admin/ebooks' },
  { key:'roadmaps', label:'Road Maps', icon:'bi-signpost-split-fill', path:'/admin/roadmaps' },
  { key:'jobPosts', label:'Vacancies', icon:'bi-briefcase-fill', path:'/admin/vacancies' },
  { key:'posts', label:'TroopersTalk Posts', icon:'bi-chat-square-text-fill', path:'/admin/troopers-talk' },
  { key:'tech_snake_rooms', label:'Snake Rooms', icon:'bi-controller', path:'/admin/rooms' },
];

export default function AdminMaster(){
  const [counts,setCounts]=useState({});
  const [loading,setLoading]=useState(true);
  const [errors,setErrors]=useState([]);

  const loadCounts=async()=>{
    setLoading(true);setErrors([]);
    const next={};const failed=[];
    await Promise.all(modules.map(async m=>{
      try{next[m.key]=(await listCollection(m.key)).length;}
      catch(err){next[m.key]=0;failed.push(`${m.key}: ${err.message}`);}
    }));
    // These are useful supporting tables shown in your existing Firebase database.
    for(const name of ['BookCategory','jobApplicants','jobApplications','userAnswers']){
      try{next[name]=(await listCollection(name)).length;}catch{}
    }
    setCounts(next);setErrors(failed);setLoading(false);
  };

  useEffect(()=>{loadCounts();},[]);
  const totalManaged=useMemo(()=>Object.values(counts).reduce((a,b)=>a+Number(b||0),0),[counts]);

  return <AdminShell title="Admin Master" subtitle="Central control panel mapped to your current Techtroopers Firestore collections." actions={<button className="btn btn-primary btn-sm" onClick={loadCounts}><i className="bi bi-arrow-clockwise me-1"/>Refresh</button>}>
    {errors.length>0&&<div className="alert alert-warning"><b>Some Firebase collections could not be read.</b><div className="mt-1">{errors.slice(0,4).join(' | ')}</div></div>}
    <div className="tt-admin-summary-grid"><div className="tt-summary-card primary"><small>Managed Records</small><strong>{loading?'…':totalManaged}</strong><span>Across connected collections</span></div><div className="tt-summary-card"><small>Exam Questions</small><strong>{loading?'…':counts.questions||0}</strong><span>questions collection</span></div><div className="tt-summary-card"><small>Book Files</small><strong>{loading?'…':counts.BookFile||0}</strong><span>{counts.BookCategory||0} categories</span></div><div className="tt-summary-card"><small>Applications</small><strong>{loading?'…':(counts.jobApplicants||0)+(counts.jobApplications||0)}</strong><span>Job portal records</span></div></div>
    <div className="tt-admin-panel mt-4"><div className="tt-panel-head"><div><h3>Administration Modules</h3><p>Each module now points to the collection names already present in your Firebase project.</p></div></div><div className="tt-module-grid">{modules.map(m=><Link to={m.path} className="tt-module-card" key={m.key}><i className={`bi ${m.icon}`}/><div><b>{m.label}</b><span>{loading?'Loading…':`${counts[m.key]||0} records`}</span></div><i className="bi bi-arrow-right"/></Link>)}<Link to="/admin/answer-key" className="tt-module-card"><i className="bi bi-key-fill"/><div><b>Answer Key</b><span>Publish / hide exam keys</span></div><i className="bi bi-arrow-right"/></Link><Link to="/admin/tier-students" className="tt-module-card"><i className="bi bi-trophy-fill"/><div><b>Tier Students</b><span>Performance grouping</span></div><i className="bi bi-arrow-right"/></Link><Link to="/admin/all-scores" className="tt-module-card"><i className="bi bi-bar-chart-fill"/><div><b>All User Scores</b><span>Aggregated candidate report</span></div><i className="bi bi-arrow-right"/></Link><Link to="/admin/data" className="tt-module-card"><i className="bi bi-database-fill"/><div><b>Firebase Data</b><span>Inspect all existing collections</span></div><i className="bi bi-arrow-right"/></Link></div></div>
    <div className="tt-admin-panel mt-4"><div className="tt-panel-head"><div><h3>Mapped Existing Collections</h3><p>No database migration is required for these modules.</p></div><span className="badge text-bg-success">universal-9b6da</span></div><div className="tt-code-note"><code>BookCategory</code><code>BookFile</code><code>categories</code><code>questions</code><code>scores</code><code>jobPosts</code><code>jobApplicants</code><code>jobApplications</code><code>posts</code><code>users</code></div></div>
  </AdminShell>;
}
