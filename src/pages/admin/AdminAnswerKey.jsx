import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import AdminShell, { EmptyRow } from '../../components/admin/AdminShell';
import { listCollection, updateRecord } from '../../services/firestoreService';
import { normalizeExamDoc, normalizeQuestionDoc } from '../../utils/firestoreAdapters';

export default function AdminAnswerKey(){
  const [categories,setCategories]=useState([]);
  const [questions,setQuestions]=useState([]);
  const [selected,setSelected]=useState('');

  const load=async()=>{
    try{
      const [c,q]=await Promise.all([listCollection('categories'),listCollection('questions')]);
      const exams=c.map(normalizeExamDoc);
      setCategories(exams);setQuestions(q.map(normalizeQuestionDoc));
      setSelected(s=>s||exams[0]?.id||'');
    }catch(e){toast.error(e.message);}
  };
  useEffect(()=>{load();},[]);

  const cat=categories.find(c=>c.id===selected);
  const filtered=useMemo(()=>{
    if(!cat)return[];
    return questions.filter(q=>q.category===cat.category||q.examId===cat.id||q.examId===cat.category);
  },[questions,cat]);

  const toggle=async()=>{
    if(!cat)return;
    try{await updateRecord('categories',cat.id,{showAnswerKey:!cat.showAnswerKey});toast.success(!cat.showAnswerKey?'Answer key enabled':'Answer key hidden');load();}
    catch(e){toast.error(e.message);}
  };

  return <AdminShell title="Answer Key Manager" subtitle="Controls answer-key visibility using your existing categories and questions collections.">
    <div className="tt-admin-panel"><div className="tt-panel-head"><div><h3>Answer Key Visibility</h3><p>Questions are matched by the exam category name, for example <code>JAVA-UT1</code>.</p></div></div>
      <div className="row g-3 align-items-end"><div className="col-md-6"><label className="form-label">Select Exam</label><select className="form-select" value={selected} onChange={e=>setSelected(e.target.value)}>{categories.map(c=><option key={c.id} value={c.id}>{c.title} — {c.category}</option>)}</select></div><div className="col-md-3"><div className="tt-status-box"><small>Public Answer Key</small><b>{cat?.showAnswerKey?'Visible':'Hidden'}</b></div></div><div className="col-md-3"><button className={`btn w-100 ${cat?.showAnswerKey?'btn-outline-danger':'btn-primary'}`} onClick={toggle}>{cat?.showAnswerKey?'Hide Answer Key':'Publish Answer Key'}</button></div></div>
    </div>
    <div className="tt-admin-panel mt-4"><div className="tt-panel-head"><div><h3>Saved Answers</h3><p>{filtered.length} questions found for <b>{cat?.category||'-'}</b>.</p></div></div><div className="table-responsive"><table className="table align-middle"><thead><tr><th>#</th><th>Question</th><th>Correct Answer</th><th>Description</th></tr></thead><tbody>{filtered.length?filtered.map((q,i)=><tr key={q.id}><td>{i+1}</td><td><b>{q.question}</b></td><td><span className="badge text-bg-success">{String.fromCharCode(65+Number(q.answer||0))}</span> {q.options?.[Number(q.answer||0)]}</td><td>{q.getQuesDesc||'-'}</td></tr>):<EmptyRow colSpan={4}/>}</tbody></table></div></div>
  </AdminShell>;
}
