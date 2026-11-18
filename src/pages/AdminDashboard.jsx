import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import AdminShell, { EmptyRow } from '../components/admin/AdminShell';
import { listCollection } from '../services/firestoreService';

const exportSheet=(rows,name)=>{const ws=XLSX.utils.json_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31));XLSX.writeFile(wb,`${name}.xlsx`);};
const tabs=[['exams','Exams'],['questions','Questions'],['users','Registered Users'],['results','Results']];
export default function AdminDashboard(){
  const [tab,setTab]=useState('exams');const [data,setData]=useState({exams:[],questions:[],users:[],results:[]});const [loading,setLoading]=useState(true);const [search,setSearch]=useState('');
  const load=async()=>{setLoading(true);const [exams,questions,users,results]=await Promise.all([listCollection('categories').catch(()=>[]),listCollection('questions').catch(()=>[]),listCollection('users').catch(()=>[]),listCollection('scores').catch(()=>[])]);setData({exams,questions,users,results});setLoading(false);};
  useEffect(()=>{load();},[]);
  const rows=useMemo(()=>data[tab].filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase())),[data,tab,search]);
  const avg=data.results.length?Math.round(data.results.reduce((a,r)=>a+Number(r.percentage||0),0)/data.results.length):0;
  const manage={exams:'/admin/exams',questions:'/admin/questions',users:'/admin/users',results:'/admin/results'}[tab];
  const exportCurrent=()=>exportSheet(rows.map(r=>({...r,createdAt:undefined,updatedAt:undefined})),`Techtroopers_${tab}`);
  return <AdminShell title="All-in-one Admin Console" subtitle="Tabbed overview of exams, questions, registered users and candidate results." actions={<button className="btn btn-outline-primary btn-sm" onClick={load}>Refresh</button>}>
    <div className="tt-admin-summary-grid"><div className="tt-summary-card primary"><small>Exams</small><strong>{data.exams.length}</strong><span>Configured categories</span></div><div className="tt-summary-card"><small>Questions</small><strong>{data.questions.length}</strong><span>MCQs in bank</span></div><div className="tt-summary-card"><small>Users</small><strong>{data.users.length}</strong><span>Registered profiles</span></div><div className="tt-summary-card"><small>Average Result</small><strong>{avg}%</strong><span>{data.results.length} attempts</span></div></div>
    <div className="tt-admin-panel mt-4"><div className="d-flex flex-wrap justify-content-between gap-2 mb-3"><div className="segmented">{tabs.map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}</div><div className="d-flex gap-2"><input className="form-control tt-admin-search" placeholder={`Search ${tab}…`} value={search} onChange={e=>setSearch(e.target.value)}/><button className="btn btn-success btn-sm" onClick={exportCurrent}>Export</button><Link className="btn btn-primary btn-sm" to={manage}>Manage</Link></div></div>
      {loading?<div className="alert alert-info">Loading Firebase data…</div>:<div className="table-responsive"><table className="table align-middle"><thead><tr>{tab==='exams'&&<><th>Exam</th><th>Code</th><th>Duration</th><th>Questions</th><th>Status</th></>}{tab==='questions'&&<><th>#</th><th>Category</th><th>Question</th><th>Answer</th></>}{tab==='users'&&<><th>#</th><th>Name</th><th>Email</th><th>Roll Number</th><th>Role</th><th>Status</th></>}{tab==='results'&&<><th>#</th><th>Candidate</th><th>Exam</th><th>Score</th><th>%</th><th>Code</th></>}</tr></thead><tbody>{!rows.length?<EmptyRow colSpan={7}/>:rows.slice(0,100).map((r,i)=>tab==='exams'?<tr key={r.id}><td><b>{r.title||r.name||r.category}</b></td><td>{r.code||'-'}</td><td>{r.timer||45} min</td><td>{r.numQuestions||'-'}</td><td>{r.status||'Available'}</td></tr>:tab==='questions'?<tr key={r.id}><td>{i+1}</td><td>{r.category||r.examId||'-'}</td><td><b>{r.question}</b></td><td>{String.fromCharCode(65+Number(r.answer||0))}</td></tr>:tab==='users'?<tr key={r.id}><td>{i+1}</td><td><b>{r.name||'-'}</b></td><td>{r.email||'-'}</td><td>{r.rollNumber||'-'}</td><td>{r.role||'student'}</td><td>{r.status||'active'}</td></tr>:<tr key={r.id}><td>{i+1}</td><td><b>{r.name||'-'}</b><small className="d-block text-muted">{r.rollNumber||r.email}</small></td><td>{r.categoryName||r.category||r.examId}</td><td>{r.score}/{r.total}</td><td>{r.percentage||0}%</td><td>{r.secretCode||'-'}</td></tr>)}</tbody></table></div>}
      {rows.length>100&&<div className="small text-muted mt-2">Showing first 100 records. Use the dedicated manager or Export for all filtered data.</div>}
    </div>
  </AdminShell>;
}
