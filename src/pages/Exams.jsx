import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../components/PageMeta';
import { exams as seedExams } from '../data/demoData';
import useLiveCollection from '../hooks/useLiveCollection';
import { normalizeExamDoc } from '../utils/firestoreAdapters';

export const normalizeExam = normalizeExamDoc;

export default function Exams(){
  const navigate=useNavigate();
  const {data:raw,loading,error}=useLiveCollection('categories',seedExams);
  const exams=useMemo(()=>raw.map(normalizeExam),[raw]);
  const [search,setSearch]=useState('');
  const [level,setLevel]=useState('All');

  const filtered=useMemo(()=>exams.filter(e=>(level==='All'||e.level===level)&&[e.title,e.subject,e.code,e.category].join(' ').toLowerCase().includes(search.toLowerCase())),[exams,search,level]);

  return <>
    <PageMeta title="Online Exams"/>
    <section className="page-hero exam-hero"><div className="container-xxl hero-grid mini"><div><span className="eyebrow">ONLINE EXAMINATION PORTAL</span><h1>Assess your skills. <span>One exam at a time.</span></h1><p>Timed Firebase-connected assessments with start code, question navigator, automatic submission and instant results.</p></div><div className="stats-row"><div><b>{exams.length}</b><span>Total Exams</span></div><div><b>{exams.filter(e=>e.status==='Available').length}</b><span>Available</span></div><div><b>{exams.reduce((a,b)=>a+Number(b.questions||0),0)}</b><span>Questions</span></div></div></div></section>
    <main className="section pt-4"><div className="container-xxl">
      {error&&<div className="alert alert-warning py-2">Firebase exams could not be loaded, so built-in demo exams are shown.</div>}
      <div className="toolbar"><div className="search-box"><i className="bi bi-search"/><input placeholder="Search exam, subject or code..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="segmented">{['All','Beginner','Intermediate','Advanced'].map(x=><button key={x} className={level===x?'active':''} onClick={()=>setLevel(x)}>{x}</button>)}</div><span className="count-chip">{loading?'Loading…':`${filtered.length} exams`}</span></div>
      <div className="card-grid three mt-4">{filtered.map(exam=><article className={`exam-card ${exam.status!=='Available'?'disabled':''}`} key={exam.id}><div className="exam-top"><span className="exam-icon">{String(exam.subject).slice(0,2).toUpperCase()}</span><span className={`availability ${exam.status==='Available'?'live':'upcoming'}`}>{exam.status}</span></div><small>{exam.subject}</small><h3>{exam.title}</h3><div className="exam-code">{exam.code}</div><p>{exam.description||`Category: ${exam.category}`}</p><div className="exam-meta"><span><b>{exam.questions}</b> Questions</span><span><b>{exam.marks}</b> Marks</span><span><b>{exam.duration}</b> Min</span></div><div className="exam-footer"><span className="level-pill">{exam.level}</span><button disabled={exam.status!=='Available'} onClick={()=>navigate(`/exam/welcome/${exam.id}`)}>View Exam →</button></div></article>)}</div>
    </div></main>
  </>;
}
