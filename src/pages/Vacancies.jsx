import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageMeta from '../components/PageMeta';
import { vacancies as seed } from '../data/demoData';
import useLiveCollection from '../hooks/useLiveCollection';
import { normalizeJobPost } from '../utils/firestoreAdapters';

export default function Vacancies(){
  const {data:raw,error,loading}=useLiveCollection('jobPosts',seed);
  const items=useMemo(()=>raw.map(normalizeJobPost),[raw]);
  const [q,setQ]=useState('');
  const filtered=useMemo(()=>items.filter(v=>[v.title,v.company,v.location,v.type,v.category,v.experienceLevel,...v.skills].join(' ').toLowerCase().includes(q.toLowerCase())&&v.isActive),[items,q]);
  return <><PageMeta title="Troop Vacancies"/><section className="page-hero"><div className="container-xxl"><span className="eyebrow">TROOP VACANCIES</span><h1>Internships and jobs worth exploring.</h1><p>Opportunities are loaded from your existing <code>jobPosts</code> collection.</p></div></section><main className="section pt-4"><div className="container-xxl">{error&&<div className="alert alert-danger">Could not read jobPosts: {error}</div>}<div className="toolbar"><div className="search-box"><i className="bi bi-search"/><input placeholder="Search role, company, location or category..." value={q} onChange={e=>setQ(e.target.value)}/></div><span className="count-chip">{loading?'Loading…':`${filtered.length} opportunities`}</span></div><div className="vacancy-list mt-4">{filtered.map(v=><article className="vacancy-card" key={v.id}><div><span className="eyebrow">{v.jobType||v.category||'Opportunity'}</span><h3>{v.title}</h3><p className="mb-1"><b>{v.company}</b> · {v.location}</p><p>{v.description}</p><div className="tags">{[v.category,v.experienceLevel,...v.skills].filter(Boolean).map(s=><span key={s}>{s}</span>)}</div></div><div className="vacancy-side">{v.stipend&&<b>{v.stipend}</b>}<small>{v.applyMode?`Apply via ${v.applyMode}`:'Apply online'}</small><Link className="btn btn-primary btn-sm" to={`/vacancies/${v.id}`}>View Details</Link></div></article>)}</div></div></main></>;
}
