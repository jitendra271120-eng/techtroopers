import { useMemo, useState } from 'react';
import PageMeta from '../components/PageMeta';
import { questions as seed, exams as seedExams } from '../data/demoData';
import useLiveCollection from '../hooks/useLiveCollection';
import { normalizeExamDoc, normalizeQuestionDoc } from '../utils/firestoreAdapters';

export default function QuestionBanks(){
  const {data:qsRaw,error}=useLiveCollection('questions',seed);
  const {data:examsRaw}=useLiveCollection('categories',seedExams);
  const qs=useMemo(()=>qsRaw.map(normalizeQuestionDoc),[qsRaw]);
  const exams=useMemo(()=>examsRaw.map(normalizeExamDoc),[examsRaw]);
  const [category,setCategory]=useState('All');
  const filtered=useMemo(()=>category==='All'?qs:qs.filter(q=>q.category===category||q.examId===category),[qs,category]);

  return <><PageMeta title="Question Banks"/><section className="page-hero"><div className="container-xxl"><span className="eyebrow">QUESTION BANKS</span><h1>Practice before you enter the exam hall.</h1><p>Questions are grouped by the same category names used by your exam database.</p></div></section><main className="section pt-4"><div className="container-xxl">{error&&<div className="alert alert-warning">Showing built-in practice questions because Firebase could not be read.</div>}<div className="toolbar"><select className="form-select compact" value={category} onChange={e=>setCategory(e.target.value)}><option value="All">All Exams</option>{exams.map(e=><option key={e.id} value={e.category}>{e.title} — {e.category}</option>)}</select><span className="count-chip">{filtered.length} questions</span></div><div className="question-bank-list mt-4">{filtered.map((q,i)=><details className="qb-item" key={q.id}><summary><span>{i+1}</span><b>{q.question}</b></summary><div className="qb-body"><ol type="A">{(q.options||[]).map((o,idx)=><li key={`${q.id}-${idx}`} className={idx===q.answer?'correct':''}>{o}</li>)}</ol><p><b>Answer:</b> {String.fromCharCode(65+q.answer)}{q.getQuesDesc?` — ${q.getQuesDesc}`:''}</p></div></details>)}</div></div></main></>;
}
