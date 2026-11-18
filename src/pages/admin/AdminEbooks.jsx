import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import AdminShell, { EmptyRow } from '../../components/admin/AdminShell';
import { addRecord, listCollection, removeRecord, updateRecord } from '../../services/firestoreService';
import { storage } from '../../config/firebase';
import { normalizeBookCategory, normalizeBookFile } from '../../utils/firestoreAdapters';

const blank={title:'',categoryId:'',categoryName:'',subCat:'',price:'',fileUrl:''};
const blankCat={category:'',description:''};

export default function AdminEbooks(){
  const [rows,setRows]=useState([]);
  const [categories,setCategories]=useState([]);
  const [form,setForm]=useState(blank);
  const [categoryForm,setCategoryForm]=useState(blankCat);
  const [editId,setEditId]=useState('');
  const [catEditId,setCatEditId]=useState('');
  const [search,setSearch]=useState('');
  const [uploading,setUploading]=useState(false);
  const fileRef=useRef();

  const load=async()=>{
    try{
      const [files,cats]=await Promise.all([listCollection('BookFile'),listCollection('BookCategory')]);
      const normalizedCats=cats.map(normalizeBookCategory);
      setRows(files.map(normalizeBookFile));
      setCategories(normalizedCats);
      setForm(f=>{
        if(f.categoryId || !normalizedCats[0]) return f;
        return {...f,categoryId:normalizedCats[0].id,categoryName:normalizedCats[0].category};
      });
    }catch(e){toast.error(e.message||'Unable to load BookFile / BookCategory');}
  };
  useEffect(()=>{load();},[]);

  const filtered=useMemo(()=>rows.filter(r=>[r.title,r.categoryName,r.subCat,r.price].join(' ').toLowerCase().includes(search.toLowerCase())),[rows,search]);
  const reset=()=>{setEditId('');const c=categories[0];setForm({...blank,categoryId:c?.id||'',categoryName:c?.category||''});};
  const edit=row=>{setEditId(row.id);setForm({title:row.title||'',categoryId:row.categoryId||'',categoryName:row.categoryName||'',subCat:row.subCat||'',price:row.price??'',fileUrl:row.fileUrl||''});window.scrollTo({top:0,behavior:'smooth'});};
  const chooseCategory=id=>{const c=categories.find(x=>x.id===id);setForm(f=>({...f,categoryId:id,categoryName:c?.category||''}));};

  const uploadFile=async file=>{
    if(!file)return;
    setUploading(true);
    try{
      const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
      const storageRef=ref(storage,`BookFile/${Date.now()}_${safe}`);
      await uploadBytes(storageRef,file);
      const url=await getDownloadURL(storageRef);
      setForm(f=>({...f,fileUrl:url}));
      toast.success('File uploaded. Save the resource to Firestore.');
    }catch(e){toast.error(e.message);}
    finally{setUploading(false);if(fileRef.current)fileRef.current.value='';}
  };

  const submit=async e=>{
    e.preventDefault();
    const selected=categories.find(c=>c.id===form.categoryId);
    const payload={
      title:form.title.trim(),
      categoryId:form.categoryId,
      categoryName:selected?.category||form.categoryName.trim(),
      subCat:form.subCat.trim(),
      price:String(form.price??'').trim(),
      fileUrl:form.fileUrl.trim(),
    };
    try{
      if(editId)await updateRecord('BookFile',editId,payload);
      else await addRecord('BookFile',payload);
      toast.success(editId?'BookFile updated':'BookFile created');
      reset();await load();
    }catch(e){toast.error(e.message);}
  };

  const saveCategory=async e=>{
    e.preventDefault();
    const category=categoryForm.category.trim();
    if(!category)return;
    try{
      const payload={category,description:categoryForm.description.trim()};
      if(catEditId) await updateRecord('BookCategory',catEditId,payload);
      else await addRecord('BookCategory',payload);
      toast.success(catEditId?'Book category updated':'Book category added');
      setCatEditId('');setCategoryForm(blankCat);await load();
    }catch(e){toast.error(e.message);}
  };

  const editCategory=c=>{setCatEditId(c.id);setCategoryForm({category:c.category||'',description:c.description||''});};
  const deleteCategory=async c=>{
    const inUse=rows.some(r=>r.categoryId===c.id || r.categoryName===c.category);
    if(inUse){toast.error('This category is used by BookFile records. Reassign those resources first.');return;}
    if(!confirm(`Delete BookCategory "${c.category}"?`))return;
    try{await removeRecord('BookCategory',c.id);toast.success('Book category deleted');await load();}catch(e){toast.error(e.message);}
  };

  const del=async id=>{if(!confirm('Delete this BookFile document?'))return;try{await removeRecord('BookFile',id);toast.success('Resource deleted');await load();}catch(e){toast.error(e.message);}};

  return <AdminShell title="E-Books & Notes" subtitle="Connected to your existing BookCategory and BookFile collections.">
    <div className="tt-admin-panel"><div className="tt-panel-head"><div><h3>{editId?'Edit BookFile':'Add BookFile'}</h3><p>Uses your existing fields: title, categoryId, categoryName, subCat, price and fileUrl.</p></div>{editId&&<button className="btn btn-light border btn-sm" onClick={reset}>Cancel</button>}</div>
      <form className="row g-3" onSubmit={submit}>
        <div className="col-md-4"><label className="form-label">Title</label><input required className="form-control" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
        <div className="col-md-3"><label className="form-label">Book Category</label><select required className="form-select" value={form.categoryId} onChange={e=>chooseCategory(e.target.value)}><option value="">Select category</option>{categories.map(c=><option value={c.id} key={c.id}>{c.category}</option>)}</select></div>
        <div className="col-md-3"><label className="form-label">Sub Category</label><input className="form-control" placeholder="e.g. Python Interview" value={form.subCat} onChange={e=>setForm({...form,subCat:e.target.value})}/></div>
        <div className="col-md-2"><label className="form-label">Price</label><input className="form-control" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></div>
        <div className="col-md-8"><label className="form-label">Firebase Storage / File URL</label><input className="form-control" value={form.fileUrl} onChange={e=>setForm({...form,fileUrl:e.target.value})} placeholder="https://firebasestorage.googleapis.com/..."/></div>
        <div className="col-md-4"><label className="form-label">Upload New File</label><input ref={fileRef} type="file" className="form-control" onChange={e=>uploadFile(e.target.files?.[0])} disabled={uploading}/><small className="text-muted">{uploading?'Uploading…':'Optional; uploaded URL fills automatically.'}</small></div>
        <div className="col-12"><button className="btn btn-primary px-4" disabled={uploading}>{editId?'Update Resource':'Save Resource'}</button></div>
      </form>
    </div>

    <div className="tt-admin-panel mt-4">
      <div className="tt-panel-head"><div><h3>{catEditId?'Edit Book Category':'Book Categories'}</h3><p>Manage documents in <code>BookCategory</code>. Existing resources remain linked by categoryId/categoryName.</p></div>{catEditId&&<button className="btn btn-light border btn-sm" onClick={()=>{setCatEditId('');setCategoryForm(blankCat);}}>Cancel</button>}</div>
      <form className="row g-3" onSubmit={saveCategory}><div className="col-md-4"><input required className="form-control" placeholder="Category name" value={categoryForm.category} onChange={e=>setCategoryForm({...categoryForm,category:e.target.value})}/></div><div className="col-md-6"><input className="form-control" placeholder="Description" value={categoryForm.description} onChange={e=>setCategoryForm({...categoryForm,description:e.target.value})}/></div><div className="col-md-2"><button className="btn btn-outline-primary w-100">{catEditId?'Update':'Add Category'}</button></div></form>
      <div className="table-responsive mt-3"><table className="table align-middle"><thead><tr><th>Category</th><th>Description</th><th>Resources</th><th/></tr></thead><tbody>{categories.length?categories.map(c=><tr key={c.id}><td><b>{c.category}</b></td><td>{c.description||'-'}</td><td>{rows.filter(r=>r.categoryId===c.id||r.categoryName===c.category).length}</td><td className="text-nowrap"><button className="btn btn-sm btn-outline-primary me-1" onClick={()=>editCategory(c)}>Edit</button><button className="btn btn-sm btn-outline-danger" onClick={()=>deleteCategory(c)}>Delete</button></td></tr>):<EmptyRow colSpan={4}/>}</tbody></table></div>
    </div>

    <div className="tt-admin-panel mt-4"><div className="tt-panel-head"><div><h3>BookFile Records</h3><p>{filtered.length} shown of {rows.length}.</p></div><input className="form-control tt-admin-search" placeholder="Search resources…" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="table-responsive"><table className="table align-middle"><thead><tr><th>#</th><th>Title</th><th>Category</th><th>Sub Category</th><th>Price</th><th>File</th><th/></tr></thead><tbody>{filtered.length?filtered.map((r,i)=><tr key={r.id}><td>{i+1}</td><td><b>{r.title}</b></td><td>{r.categoryName||'-'}</td><td>{r.subCat||'-'}</td><td>{r.price!==''?`₹${r.price}`:'-'}</td><td>{r.fileUrl?<a className="text-primary" href={r.fileUrl} target="_blank" rel="noreferrer">Open File</a>:'-'}</td><td className="text-nowrap"><button className="btn btn-sm btn-outline-primary me-1" onClick={()=>edit(r)}>Edit</button><button className="btn btn-sm btn-outline-danger" onClick={()=>del(r.id)}>Delete</button></td></tr>):<EmptyRow colSpan={7}/>}</tbody></table></div></div>
  </AdminShell>;
}
