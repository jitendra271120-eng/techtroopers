import { useEffect, useMemo, useState } from 'react';
import PageMeta from '../components/PageMeta';
import { listCollection } from '../services/firestoreService';
import { normalizeExamDoc, normalizeQuestionDoc } from '../utils/firestoreAdapters';

export default function ViewAnswerKey(){
  const [categories,setCategories]=useState([]);const [questions,setQuestions]=useState([]);const [selected,setSelected]=useState('');const [loading,setLoading]=useState(true);
  useEffect(()=>{Promise.all([listCollection('categories'),listCollection('questions')]).then(([c,q])=>{const visible=c.map(normalizeExamDoc).filter(x=>x.showAnswerKey===true);setCategories(visible);setQuestions(q.map(normalizeQuestionDoc));setSelected(visible[0]?.id||'');}).finally(()=>setLoading(false));},[]);
  const cat=categories.find(c=>c.id===selected);
  const rows=useMemo(()=>cat?questions.filter(q=>q.category===cat.category||q.examId===cat.id||q.examId===cat.category):[],[questions,cat]);
  return <><PageMeta title="Answer Keys"/><section className="page-hero"><div className="container-xxl"><span className="eyebrow">ANSWER KEY</span><h1>Published examination answer keys.</h1><p>Only exams enabled by the administrator are shown here.</p></div></section><main className="section"><div className="container-xxl">{loading?<div className="alert alert-info">Loading answer keys…</div>:!categories.length?<div className="content-card"><h3>No answer key is currently published.</h3><p className="mb-0">The administrator can enable an answer key after the examination.</p></div>:<><div className="toolbar"><select className="form-select compact" value={selected} onChange={e=>setSelected(e.target.value)}>{categories.map(c=><option value={c.id} key={c.id}>{c.title} — {c.category}</option>)}</select><span className="count-chip">{rows.length} answers</span></div><div className="question-bank-list mt-4">{rows.map((q,i)=><article className="qb-item open-key" key={q.id}><div className="d-flex gap-3"><span className="qb-no">{i+1}</span><div><h4>{q.question}</h4><p className="mb-1"><b>Correct Answer:</b> {String.fromCharCode(65+Number(q.answer||0))}. {q.options?.[Number(q.answer||0)]}</p>{q.getQuesDesc&&<span className="text-muted">{q.getQuesDesc}</span>}</div></div></article>)}</div></>}</div></main></>;
}
