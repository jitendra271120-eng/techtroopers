import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import AdminShell, { EmptyRow } from '../../components/admin/AdminShell';
import { listCollection, timestampToText } from '../../services/firestoreService';

const collections = [
  'BookCategory','BookFile','categories','questions','scores','userAnswers','users','admins',
  'jobPosts','jobApplicants','jobApplications','jobapplicantsDetails','posts',
  'C','C++','Java','JavaScript','Python','Languages','Categories',
  'QuestionBankCategory','QuestionBankSubCategory','UserProgress','careerCat','course',
  'roadmaps','portfolioPosts','tech_snake_rooms','tech_snake_scores','internshipEnroll'
];

const primitive = value => {
  if (value === null || value === undefined) return '';
  if (value?.toDate || value?.seconds) return timestampToText(value);
  if (Array.isArray(value)) return value.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export default function AdminFirebaseData(){
  const [name,setName]=useState('BookFile');
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(false);
  const [search,setSearch]=useState('');

  const load=async(collectionName=name)=>{
    setLoading(true);
    try{setRows(await listCollection(collectionName));}
    catch(e){setRows([]);toast.error(`${collectionName}: ${e.message}`);}
    finally{setLoading(false);}
  };
  useEffect(()=>{load(name);},[name]);

  const filtered=useMemo(()=>rows.filter(r=>JSON.stringify(r,(k,v)=>v?.seconds?new Date(v.seconds*1000).toISOString():v).toLowerCase().includes(search.toLowerCase())),[rows,search]);
  const columns=useMemo(()=>{
    const keys=[];
    filtered.slice(0,50).forEach(r=>Object.keys(r).forEach(k=>{if(!keys.includes(k))keys.push(k);}));
    const ordered=['id',...keys.filter(k=>k!=='id')];
    return ordered.slice(0,10);
  },[filtered]);

  const exportExcel=()=>{
    const out=filtered.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,primitive(v)])));
    const ws=XLSX.utils.json_to_sheet(out);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31));XLSX.writeFile(wb,`Techtroopers_${name}.xlsx`);
  };

  return <AdminShell title="Firebase Data Inspector" subtitle="Read-only inspector for the existing Techtroopers Firestore collections you shared." actions={<><button className="btn btn-outline-primary btn-sm" onClick={()=>load(name)}>Refresh</button><button className="btn btn-success btn-sm" onClick={exportExcel} disabled={!filtered.length}>Export Excel</button></>}>
    <div className="tt-admin-panel"><div className="row g-3 align-items-end"><div className="col-md-4"><label className="form-label">Collection</label><select className="form-select" value={name} onChange={e=>setName(e.target.value)}>{collections.map(c=><option key={c}>{c}</option>)}</select></div><div className="col-md-6"><label className="form-label">Search this collection</label><input className="form-control" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search any visible field…"/></div><div className="col-md-2"><div className="tt-status-box"><small>Documents</small><b>{loading?'…':filtered.length}</b></div></div></div></div>
    <div className="tt-admin-panel mt-4"><div className="tt-panel-head"><div><h3>{name}</h3><p>{rows.length} documents loaded from Firestore. Showing up to 10 discovered fields in the table.</p></div></div><div className="table-responsive"><table className="table align-middle"><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{loading?<EmptyRow colSpan={Math.max(1,columns.length)} text="Loading…"/>:filtered.length?filtered.map(r=><tr key={r.id}>{columns.map(c=><td key={c} style={{maxWidth:280,whiteSpace:'normal',wordBreak:'break-word'}}>{primitive(r[c])||'-'}</td>)}</tr>):<EmptyRow colSpan={Math.max(1,columns.length)}/>}</tbody></table></div></div>
  </AdminShell>;
}
