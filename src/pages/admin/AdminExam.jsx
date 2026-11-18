import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import AdminShell, { EmptyRow } from '../../components/admin/AdminShell';
import { addRecord, listCollection, removeRecord, updateRecord } from '../../services/firestoreService';
import { normalizeExamDoc } from '../../utils/firestoreAdapters';

const emptyForm={title:'',code:'',category:'',timer:45,marksPerQuestion:1,totalMarks:20,numQuestions:20,secretCodes:'',showAnswerKey:false,status:'Available',level:'Intermediate',description:''};

export default function AdminExam(){
  const [rows,setRows]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [editId,setEditId]=useState(''); const [form,setForm]=useState(emptyForm); const [search,setSearch]=useState('');
  const load=async()=>{setLoading(true);setError('');try{setRows((await listCollection('categories')).map(normalizeExamDoc));}catch(e){setError(e.message);}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const filtered=useMemo(()=>rows.filter(r=>[r.title,r.name,r.code,r.category,r.status].join(' ').toLowerCase().includes(search.toLowerCase())),[rows,search]);
  const change=e=>{const {name,value,type,checked}=e.target;setForm(f=>({...f,[name]:type==='checkbox'?checked:value}));};
  const reset=()=>{setEditId('');setForm(emptyForm);};
  const edit=r=>{setEditId(r.id);setForm({title:r.title||r.name||'',code:r.code||'',category:r.category||r.name||'',timer:r.timer??45,marksPerQuestion:r.marksPerQuestion??1,totalMarks:r.totalMarks??20,numQuestions:r.numQuestions??20,secretCodes:Array.isArray(r.secretCodes)?r.secretCodes.join(', '):(r.secretCodes||''),showAnswerKey:Boolean(r.showAnswerKey),status:r.status||'Available',level:r.level||'Intermediate',description:r.description||''});window.scrollTo({top:0,behavior:'smooth'});};
  const submit=async e=>{e.preventDefault();const payload={title:form.title.trim(),name:form.title.trim(),code:form.code.trim(),category:form.category.trim()||form.title.trim(),timer:Number(form.timer)||45,marksPerQuestion:Number(form.marksPerQuestion)||1,totalMarks:Number(form.totalMarks)||0,numQuestions:Number(form.numQuestions)||0,secretCodes:String(form.secretCodes).split(',').map(x=>x.trim()).filter(Boolean),showAnswerKey:Boolean(form.showAnswerKey),status:form.status,level:form.level,description:form.description.trim()};try{if(editId)await updateRecord('categories',editId,payload);else await addRecord('categories',payload);toast.success(editId?'Exam updated':'Exam created');reset();load();}catch(err){toast.error(err.message);}};
  const del=async id=>{if(!confirm('Delete this exam/category? Questions are not deleted automatically.'))return;try{await removeRecord('categories',id);toast.success('Exam deleted');load();}catch(e){toast.error(e.message);}};
  const exportExcel=()=>{const out=rows.map(r=>({id:r.id,title:r.title||r.name,code:r.code,category:r.category,timer:r.timer,marksPerQuestion:r.marksPerQuestion,totalMarks:r.totalMarks,numQuestions:r.numQuestions,secretCodes:(r.secretCodes||[]).join?.(', ')||r.secretCodes,showAnswerKey:r.showAnswerKey,status:r.status,level:r.level}));const ws=XLSX.utils.json_to_sheet(out);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Exams');XLSX.writeFile(wb,'Techtroopers_Exams.xlsx');};
  return <AdminShell title="Exam Manager" subtitle="Create and manage categories, timer, marks, secret codes and answer-key visibility." actions={<button className="btn btn-success btn-sm" onClick={exportExcel}><i className="bi bi-file-earmark-excel me-1"/>Export</button>}>
    <div className="tt-admin-panel"><div className="tt-panel-head"><div><h3>{editId?'Edit Exam':'Add New Exam'}</h3><p>Fields match the Techtroopers online-exam category model.</p></div>{editId&&<button className="btn btn-light border btn-sm" onClick={reset}>Cancel Edit</button>}</div>
      <form onSubmit={submit} className="row g-3">
        <div className="col-md-4"><label className="form-label">Exam / Category Title</label><input required className="form-control" name="title" value={form.title} onChange={change}/></div>
        <div className="col-md-2"><label className="form-label">Exam Code</label><input className="form-control" name="code" value={form.code} onChange={change}/></div>
        <div className="col-md-3"><label className="form-label">Topic Category</label><input className="form-control" name="category" value={form.category} onChange={change}/></div>
        <div className="col-md-3"><label className="form-label">Status</label><select className="form-select" name="status" value={form.status} onChange={change}><option>Available</option><option>Upcoming</option><option>Draft</option><option>Closed</option></select></div>
        <div className="col-md-2"><label className="form-label">Duration (min)</label><input type="number" min="1" className="form-control" name="timer" value={form.timer} onChange={change}/></div>
        <div className="col-md-2"><label className="form-label">Marks / Question</label><input type="number" min="0" step="0.5" className="form-control" name="marksPerQuestion" value={form.marksPerQuestion} onChange={change}/></div>
        <div className="col-md-2"><label className="form-label">Total Marks</label><input type="number" min="0" className="form-control" name="totalMarks" value={form.totalMarks} onChange={change}/></div>
        <div className="col-md-2"><label className="form-label">No. Questions</label><input type="number" min="1" className="form-control" name="numQuestions" value={form.numQuestions} onChange={change}/></div>
        <div className="col-md-2"><label className="form-label">Level</label><select className="form-select" name="level" value={form.level} onChange={change}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
        <div className="col-md-6"><label className="form-label">Secret / Start Codes <small>(comma separated)</small></label><input className="form-control" name="secretCodes" value={form.secretCodes} onChange={change} placeholder="JAVA2026, SET-B"/></div>
        <div className="col-md-4"><label className="form-label">Description</label><input className="form-control" name="description" value={form.description} onChange={change}/></div>
        <div className="col-md-2 d-flex align-items-end"><label className="form-check mb-2"><input className="form-check-input" type="checkbox" name="showAnswerKey" checked={form.showAnswerKey} onChange={change}/><span className="form-check-label ms-1">Show Answer Key</span></label></div>
        <div className="col-12"><button className="btn btn-primary px-4">{editId?'Update Exam':'Save Exam'}</button></div>
      </form>
    </div>
    <div className="tt-admin-panel mt-4"><div className="tt-panel-head"><div><h3>Existing Exams</h3><p>{rows.length} Firebase records in <code>categories</code>.</p></div><input className="form-control tt-admin-search" placeholder="Search exams…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
      {error&&<div className="alert alert-danger">{error}</div>}
      <div className="table-responsive"><table className="table align-middle"><thead><tr><th>Exam</th><th>Code</th><th>Duration</th><th>Questions</th><th>Marks</th><th>Codes</th><th>Answer Key</th><th>Status</th><th/></tr></thead><tbody>{loading?<EmptyRow colSpan={9} text="Loading…"/>:filtered.length?filtered.map(r=><tr key={r.id}><td><b>{r.title||r.name||r.category}</b><small className="d-block text-muted">{r.category}</small></td><td>{r.code||'-'}</td><td>{r.timer||45} min</td><td>{r.numQuestions||'-'}</td><td>{r.totalMarks||r.marks||'-'}</td><td><small>{(r.secretCodes||[]).join?.(', ')||r.secretCodes||'-'}</small></td><td>{r.showAnswerKey?<span className="badge text-bg-success">Visible</span>:<span className="badge text-bg-secondary">Hidden</span>}</td><td>{r.status||'Available'}</td><td className="text-nowrap"><button className="btn btn-sm btn-outline-primary me-1" onClick={()=>edit(r)}>Edit</button><button className="btn btn-sm btn-outline-danger" onClick={()=>del(r.id)}>Delete</button></td></tr>):<EmptyRow colSpan={9}/>}</tbody></table></div>
    </div>
  </AdminShell>;
}
