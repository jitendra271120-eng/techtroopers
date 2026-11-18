import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs,
  increment, onSnapshot, serverTimestamp, setDoc, updateDoc,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import PageMeta from "../components/PageMeta";
import { useAuth } from "../contexts/AuthContext";
import { db, storage } from "../config/firebase";

const STAGES = ["Idea", "Planning", "Building", "Testing", "Completed"];
const CATEGORIES = [
  "Web Development", "Mobile App", "AI & ML", "Data Science", "Cyber Security",
  "Cloud Computing", "IoT", "Desktop Application", "Game Development", "Research", "Other",
];

const arr = (v) => Array.isArray(v) ? v.filter(Boolean) : String(v || "").split(",").map(x => x.trim()).filter(Boolean);
const cleanUrl = (u = "") => !u.trim() ? "" : /^https?:\/\//i.test(u.trim()) ? u.trim() : `https://${u.trim()}`;
const initials = (name = "") => {
  const p = String(name || "TT").trim().split(/\s+/);
  return p.length > 1 ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase() : p[0].slice(0, 2).toUpperCase();
};
const dateText = (v) => {
  if (!v) return "Recently";
  const d = v?.toDate ? v.toDate() : v?.seconds ? new Date(v.seconds * 1000) : new Date(v);
  return Number.isNaN(d.getTime()) ? "Recently" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const ownerUid = (p = {}) => p.ownerUid || p.authorUid || p.userId || p.uid || "";
const ownerName = (p = {}) => p.ownerName || p.authorName || p.userName || p.name || p.ownerEmail || p.authorEmail || p.email || "Student Developer";
const ownerEmail = (p = {}) => p.ownerEmail || p.authorEmail || p.email || "";
const ownerPhoto = (p = {}) => p.ownerPhoto || p.authorPhoto || p.photoURL || p.photo || "";
const isOwner = (p, user) => !!user && ((ownerUid(p) && ownerUid(p) === user.uid) || (ownerEmail(p) && user.email && ownerEmail(p).toLowerCase() === user.email.toLowerCase()));
const isAdmin = (user) => ["admin", "superadmin", "super_admin"].includes(String(user?.role || "").toLowerCase());
const collabOpen = (p = {}) => p.collaborationOpen !== false && p.status !== "Archived" && p.status !== "Hidden";
const likesBy = (p = {}) => arr(p.likesBy?.length ? p.likesBy : p.likedBy);
const likeCount = (p = {}) => typeof p.likesCount === "number" ? p.likesCount : typeof p.likes === "number" ? p.likes : likesBy(p).length;
const interestCount = (p = {}) => typeof p.interestCount === "number" ? p.interestCount : arr(p.interestedBy).length;
const collaborators = (p = {}) => Array.isArray(p.collaborators) ? p.collaborators : [];

export default function Portfolio() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [onlyCollaboration, setOnlyCollaboration] = useState(false);
  const [tab, setTab] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [interestProject, setInterestProject] = useState(null);
  const [requestProject, setRequestProject] = useState(null);
  const [deletingProjectId, setDeletingProjectId] = useState("");
  const [myInterestMap, setMyInterestMap] = useState({});
  const [myInterest, setMyInterest] = useState(null);
  const [interestMessage, setInterestMessage] = useState("");
  const [interestSkills, setInterestSkills] = useState("");
  const [sendingInterest, setSendingInterest] = useState(false);
  const [interestRequests, setInterestRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [projectImage, setProjectImage] = useState(null);
  const [previewImage, setPreviewImage] = useState("");
  const imageInputRef = useRef(null);

  const [form, setForm] = useState({
    title: "", tagline: "", description: "", category: "Web Development", stage: "Building",
    tech: "", lookingFor: "", githubUrl: "", projectUrl: "", collaborationOpen: true,
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "portfolioPosts"), snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.status !== "Draft" && p.status !== "Hidden")
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setProjects(rows); setLoading(false); setError("");
    }, e => { console.error(e); setError(e.message || "Could not load repositories."); setLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.uid || !projects.length) { if (!cancelled) setMyInterestMap({}); return; }
      const entries = await Promise.all(projects.map(async p => {
        if (isOwner(p, user)) return [p.id, null];
        try {
          const s = await getDoc(doc(db, "portfolioPosts", p.id, "interests", user.uid));
          return [p.id, s.exists() ? { id: s.id, ...s.data() } : null];
        } catch { return [p.id, null]; }
      }));
      if (!cancelled) setMyInterestMap(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [projects, user?.uid, user?.email]);

  useEffect(() => {
    if (!projects.length) return;
    const id = new URL(window.location.href).searchParams.get("project");
    if (id) {
      const found = projects.find(p => p.id === id);
      if (found) setSelectedProject(found);
    }
  }, [projects]);

  useEffect(() => {
    if (!selectedProject?.id) return;
    const latest = projects.find(p => p.id === selectedProject.id);
    if (latest) setSelectedProject(latest);
  }, [projects, selectedProject?.id]);

  useEffect(() => {
    const open = !!(showCreateModal || selectedProject || interestProject || requestProject);
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showCreateModal, selectedProject, interestProject, requestProject]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter(p => {
      const text = [p.title, p.tagline, p.description, p.category, p.stage, ...arr(p.tech), ...arr(p.lookingFor), ownerName(p)].filter(Boolean).join(" ").toLowerCase();
      return (categoryFilter === "All" || p.category === categoryFilter)
        && (stageFilter === "All" || p.stage === stageFilter)
        && (!onlyCollaboration || collabOpen(p))
        && (tab === "all" || (tab === "mine" && isOwner(p, user)) || (tab === "interested" && !!myInterestMap[p.id]))
        && (!q || text.includes(q));
    });
  }, [projects, search, categoryFilter, stageFilter, onlyCollaboration, tab, user, myInterestMap]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be below 5 MB.");
    setProjectImage(file);
    if (previewImage?.startsWith("blob:")) URL.revokeObjectURL(previewImage);
    setPreviewImage(URL.createObjectURL(file));
  };

  const resetForm = () => {
    if (previewImage?.startsWith("blob:")) URL.revokeObjectURL(previewImage);
    setForm({ title: "", tagline: "", description: "", category: "Web Development", stage: "Building", tech: "", lookingFor: "", githubUrl: "", projectUrl: "", collaborationOpen: true });
    setProjectImage(null); setPreviewImage(""); setUploadProgress(0);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const publishProject = async () => {
    if (!user) return toast.error("Please login first.");
    if (!form.title.trim()) return toast.error("Enter repository name.");
    if (!form.description.trim()) return toast.error("Enter project description.");
    setPublishing(true);
    try {
      let imageUrl = "", imagePath = "";
      if (projectImage) {
        imagePath = `portfolio/${user.uid}/${Date.now()}_${projectImage.name}`;
        const task = uploadBytesResumable(ref(storage, imagePath), projectImage);
        imageUrl = await new Promise((resolve, reject) => task.on("state_changed", s => setUploadProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)), reject, async () => resolve(await getDownloadURL(task.snapshot.ref))));
      }
      await addDoc(collection(db, "portfolioPosts"), {
        ownerUid: user.uid,
        ownerName: user.name || user.displayName || user.email || "Student",
        ownerEmail: user.email || "",
        ownerPhoto: user.photoURL || "",
        title: form.title.trim(), tagline: form.tagline.trim(), description: form.description.trim(),
        category: form.category, stage: form.stage, tech: arr(form.tech), lookingFor: arr(form.lookingFor),
        githubUrl: cleanUrl(form.githubUrl), projectUrl: cleanUrl(form.projectUrl), imageUrl, imagePath,
        collaborationOpen: form.collaborationOpen, collaborators: [], interestedBy: [], interestCount: 0,
        likesBy: [], likesCount: 0, status: "Published", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      toast.success("Repository published."); resetForm(); setShowCreateModal(false);
    } catch (e) { console.error(e); toast.error(e.message || "Could not publish repository."); }
    finally { setPublishing(false); }
  };

  const deleteProject = async (project) => {
    if (!user) return toast.error("Please login first.");
    if (!isOwner(project, user) && !isAdmin(user)) return toast.error("You can delete only your own repository.");
    if (!window.confirm(`Delete \"${project.title}\"?\n\nThis will remove the repository and collaboration requests.`)) return;
    setDeletingProjectId(project.id);
    try {
      try {
        const s = await getDocs(collection(db, "portfolioPosts", project.id, "interests"));
        await Promise.all(s.docs.map(x => deleteDoc(x.ref)));
      } catch (e) { console.warn("Interest cleanup skipped", e); }
      if (project.imagePath) {
        try { await deleteObject(ref(storage, project.imagePath)); } catch (e) { console.warn("Image cleanup skipped", e); }
      }
      await deleteDoc(doc(db, "portfolioPosts", project.id));
      if (selectedProject?.id === project.id) closeProject();
      if (requestProject?.id === project.id) setRequestProject(null);
      toast.success("Repository deleted.");
    } catch (e) { console.error(e); toast.error(e.message || "Could not delete repository."); }
    finally { setDeletingProjectId(""); }
  };

  const toggleLike = async (project) => {
    if (!user) return toast.error("Login to star this repository.");
    const starred = likesBy(project).includes(user.uid);
    try {
      await updateDoc(doc(db, "portfolioPosts", project.id), {
        likesBy: starred ? arrayRemove(user.uid) : arrayUnion(user.uid),
        likesCount: increment(starred ? -1 : 1), updatedAt: serverTimestamp(),
      });
    } catch (e) { toast.error(e.message || "Could not update star."); }
  };

  const openProject = (project) => {
    setSelectedProject(project);
    const u = new URL(window.location.href); u.searchParams.set("project", project.id); window.history.pushState({}, "", u);
  };
  const closeProject = () => {
    setSelectedProject(null);
    const u = new URL(window.location.href); u.searchParams.delete("project"); window.history.replaceState({}, "", u);
  };
  const shareProject = async (project) => {
    const u = new URL(window.location.href); u.searchParams.set("project", project.id); const shareUrl = u.toString();
    try {
      if (navigator.share) await navigator.share({ title: project.title, text: project.tagline || `View ${project.title} on Techtroopers`, url: shareUrl });
      else { await navigator.clipboard.writeText(shareUrl); toast.success("Repository link copied."); }
    } catch (e) { if (e?.name !== "AbortError") toast.error("Could not share repository."); }
  };

  const openInterestModal = async (project) => {
    if (!user) return toast.error("Login to show interest.");
    if (isOwner(project, user)) return toast("This is your own repository.");
    if (!collabOpen(project)) return toast("Collaboration is closed for this repository.");
    setInterestProject(project); setInterestMessage(""); setInterestSkills(""); setMyInterest(null);
    try {
      const s = await getDoc(doc(db, "portfolioPosts", project.id, "interests", user.uid));
      if (s.exists()) {
        const data = { id: s.id, ...s.data() };
        setMyInterest(data); setInterestMessage(data.message || ""); setInterestSkills(arr(data.skills).join(", "));
      }
    } catch (e) { console.warn(e); }
  };

  const sendInterest = async () => {
    if (!user || !interestProject) return;
    if (!interestMessage.trim()) return toast.error("Write a collaboration message.");
    setSendingInterest(true);
    try {
      const r = doc(db, "portfolioPosts", interestProject.id, "interests", user.uid);
      const old = await getDoc(r); const oldData = old.exists() ? old.data() : {}; const isNew = !old.exists();
      const next = {
        userUid: user.uid, name: user.name || user.displayName || user.email || "Student", email: user.email || "", photo: user.photoURL || "",
        skills: arr(interestSkills), message: interestMessage.trim(), status: oldData.status === "accepted" ? "accepted" : "pending",
        createdAt: oldData.createdAt || serverTimestamp(), updatedAt: serverTimestamp(),
      };
      await setDoc(r, next, { merge: true });
      if (isNew) await updateDoc(doc(db, "portfolioPosts", interestProject.id), { interestedBy: arrayUnion(user.uid), interestCount: increment(1), updatedAt: serverTimestamp() });
      setMyInterestMap(prev => ({ ...prev, [interestProject.id]: next }));
      toast.success(isNew ? "Interest sent to repository owner." : "Interest updated."); setInterestProject(null);
    } catch (e) { console.error(e); toast.error(e.message || "Could not send interest."); }
    finally { setSendingInterest(false); }
  };

  const withdrawInterest = async () => {
    if (!user || !interestProject) return;
    if (!window.confirm("Withdraw your collaboration interest?")) return;
    try {
      await deleteDoc(doc(db, "portfolioPosts", interestProject.id, "interests", user.uid));
      await updateDoc(doc(db, "portfolioPosts", interestProject.id), { interestedBy: arrayRemove(user.uid), interestCount: increment(-1), updatedAt: serverTimestamp() });
      setMyInterestMap(prev => ({ ...prev, [interestProject.id]: null })); toast.success("Interest withdrawn."); setInterestProject(null);
    } catch (e) { toast.error(e.message || "Could not withdraw interest."); }
  };

  const openRequests = (project) => {
    if (!user || (!isOwner(project, user) && !isAdmin(user))) return;
    setRequestProject(project);
  };

  useEffect(() => {
    if (!requestProject || !user) return;
    setRequestsLoading(true);
    const unsub = onSnapshot(collection(db, "portfolioPosts", requestProject.id, "interests"), snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setInterestRequests(rows); setRequestsLoading(false);
    }, () => setRequestsLoading(false));
    return () => unsub();
  }, [requestProject, user]);

  const updateInterestStatus = async (request, status) => {
    if (!requestProject) return;
    try {
      await updateDoc(doc(db, "portfolioPosts", requestProject.id, "interests", request.id), { status, reviewedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      if (status === "accepted") {
        const exists = collaborators(requestProject).some(c => c?.uid === request.userUid);
        if (!exists) await updateDoc(doc(db, "portfolioPosts", requestProject.id), {
          collaborators: arrayUnion({ uid: request.userUid, name: request.name, email: request.email, photo: request.photo || "" }), updatedAt: serverTimestamp(),
        });
        toast.success(`${request.name} added as collaborator.`);
      } else toast.success("Interest declined.");
    } catch (e) { toast.error(e.message || "Could not update request."); }
  };

  return <>
    <PageMeta title="Repositories & Collaboration" />

    <section className="gh-hero"><div className="container-xxl">
      <div className="gh-hero-main">
        <div><div className="gh-kicker"><i className="bi bi-github"/> Techtroopers Repositories</div>
          <h1>Build in public.<br/>Collaborate like developers.</h1>
          <p>Publish student repositories, share GitHub and live links, discover collaborators and review every interest request from one professional project network.</p>
        </div>
        <div className="gh-hero-actions">
          <button className="gh-btn gh-btn-green" onClick={() => user ? setShowCreateModal(true) : toast.error("Please login to create a repository.")}><i className="bi bi-journal-plus"/> New repository</button>
          {user && <button className="gh-btn" onClick={() => { setTab("mine"); document.getElementById("repositories")?.scrollIntoView({behavior:"smooth"}); }}><i className="bi bi-person-circle"/> Your repositories</button>}
        </div>
      </div>
      <div className="gh-summary">
        <div><span>Repositories</span><strong>{projects.length}</strong></div>
        <div><span>Open for collaboration</span><strong>{projects.filter(collabOpen).length}</strong></div>
        <div><span>Interest requests</span><strong>{projects.reduce((t,p)=>t+interestCount(p),0)}</strong></div>
        <div><span>Collaborators</span><strong>{projects.reduce((t,p)=>t+collaborators(p).length,0)}</strong></div>
      </div>
    </div></section>

    <main id="repositories" className="gh-page"><div className="container-xxl">
      <div className="gh-tabs">
        <button className={tab==="all"?"active":""} onClick={()=>setTab("all")}><i className="bi bi-book"/> Repositories <span>{projects.length}</span></button>
        {user && <>
          <button className={tab==="mine"?"active":""} onClick={()=>setTab("mine")}><i className="bi bi-person"/> Yours <span>{projects.filter(p=>isOwner(p,user)).length}</span></button>
          <button className={tab==="interested"?"active":""} onClick={()=>setTab("interested")}><i className="bi bi-people"/> Interested <span>{Object.values(myInterestMap).filter(Boolean).length}</span></button>
        </>}
      </div>

      <div className="gh-filterbar">
        <div className="gh-search"><i className="bi bi-search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a repository..."/></div>
        <select className="form-select" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="All">All categories</option>{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select>
        <select className="form-select" value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option value="All">All stages</option>{STAGES.map(x=><option key={x}>{x}</option>)}</select>
        <label className="gh-check"><input type="checkbox" checked={onlyCollaboration} onChange={e=>setOnlyCollaboration(e.target.checked)}/> Open to collaborate</label>
        <button className="gh-btn gh-btn-green" onClick={() => user ? setShowCreateModal(true) : toast.error("Please login to create a repository.")}><i className="bi bi-journal-plus"/> New</button>
      </div>

      {error && <div className="alert alert-warning mt-3">{error}</div>}
      {loading && <div className="gh-empty"><div className="spinner-border text-secondary"/><h3>Loading repositories...</h3></div>}
      {!loading && !filteredProjects.length && <div className="gh-empty"><i className="bi bi-journal-x"/><h3>No repositories found</h3><p>Change filters or create a repository.</p></div>}

      <div className="gh-repo-list">{filteredProjects.map(project => {
        const owner = isOwner(project,user), admin = isAdmin(user), canDelete = owner || admin;
        const starred = !!(user?.uid && likesBy(project).includes(user.uid));
        const interest = myInterestMap[project.id]; const open = collabOpen(project);
        return <article className="gh-repo-row" key={project.id}>
          <div className="gh-repo-main">
            <div className="gh-repo-title-row"><div>
              <button className="gh-repo-title" onClick={()=>openProject(project)}>{ownerName(project)}<span>/</span><strong>{project.title || "untitled-repository"}</strong></button>
              <span className="gh-public-badge">Public</span>
            </div>{canDelete && <button className="gh-icon-danger" title="Delete repository" disabled={deletingProjectId===project.id} onClick={()=>deleteProject(project)}>{deletingProjectId===project.id?<span className="spinner-border spinner-border-sm"/>:<i className="bi bi-trash3"/>}</button>}</div>
            <p className="gh-repo-description">{project.description || "No description provided."}</p>
            {project.tagline && <div className="gh-tagline">{project.tagline}</div>}
            {arr(project.tech).length>0 && <div className="gh-topics">{arr(project.tech).map(x=><span key={x}>{x}</span>)}</div>}
            {open && arr(project.lookingFor).length>0 && <div className="gh-looking"><i className="bi bi-people"/><span>Looking for: <b>{arr(project.lookingFor).join(" · ")}</b></span></div>}
            <div className="gh-repo-meta">
              <span><i className="bi bi-code-square"/>{project.category || "Project"}</span><span><i className="bi bi-diagram-3"/>{project.stage || "Building"}</span>
              <button className={starred?"starred":""} onClick={()=>toggleLike(project)}><i className={`bi ${starred?"bi-star-fill":"bi-star"}`}/>{likeCount(project)}</button>
              <span><i className="bi bi-people"/>{interestCount(project)} interested</span><span><i className="bi bi-person-check"/>{collaborators(project).length} collaborators</span><span>Updated {dateText(project.updatedAt||project.createdAt)}</span>
            </div>
          </div>
          <aside className="gh-repo-side">
            {project.imageUrl && <button className="gh-cover-thumb" onClick={()=>openProject(project)}><img src={project.imageUrl} alt={project.title||""}/></button>}
            <div className="gh-side-actions">
              {owner||admin ? <button className="gh-btn gh-btn-block" onClick={()=>openRequests(project)}><i className="bi bi-people"/> Interests {interestCount(project)>0&&<span className="gh-count">{interestCount(project)}</span>}</button>
              : <button className={`gh-btn gh-btn-block ${interest?.status==="accepted"?"gh-btn-success-soft":interest?"gh-btn-blue-soft":open?"gh-btn-green":""}`} disabled={!open} onClick={()=>openInterestModal(project)}><i className={`bi ${interest?.status==="accepted"?"bi-person-check-fill":interest?"bi-clock-history":"bi-person-plus"}`}/>{interest?.status==="accepted"?"Accepted":interest?.status==="declined"?"Interest declined":interest?"Interest sent":open?"Show interest":"Collaboration closed"}</button>}
              <button className="gh-btn gh-btn-block" onClick={()=>shareProject(project)}><i className="bi bi-share"/> Share</button>
              <button className="gh-btn gh-btn-block" onClick={()=>openProject(project)}><i className="bi bi-eye"/> View repository</button>
              {project.githubUrl && <a className="gh-btn gh-btn-block" href={project.githubUrl} target="_blank" rel="noreferrer"><i className="bi bi-github"/> GitHub</a>}
            </div>
          </aside>
        </article>;
      })}</div>
    </div></main>

    {showCreateModal && <div className="portfolio-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setShowCreateModal(false)}><div className="portfolio-modal create-project-modal">
      <div className="portfolio-modal-header"><div><span className="gh-modal-kicker"><i className="bi bi-journal-plus"/> Create a new repository</span><h2>New repository</h2><p>Publish the project, repository and collaboration requirements.</p></div><button className="modal-close" onClick={()=>setShowCreateModal(false)}><i className="bi bi-x-lg"/></button></div>
      <div className="portfolio-modal-body">
        <div className="project-image-uploader">{previewImage?<img src={previewImage} alt=""/>:<div className="upload-placeholder"><i className="bi bi-image"/><strong>Repository cover</strong><span>PNG / JPG · Max 5MB</span></div>}<input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageChange}/><button className="change-image-btn" onClick={()=>imageInputRef.current?.click()}><i className="bi bi-camera me-2"/>{previewImage?"Change cover":"Upload cover"}</button></div>
        <div className="form-grid two">
          <Field label="Repository name *" full><input className="form-control" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="ai-attendance-system"/></Field>
          <Field label="Short description" full><input className="form-control" value={form.tagline} onChange={e=>setForm({...form,tagline:e.target.value})} placeholder="One-line summary"/></Field>
          <Field label="Category"><select className="form-select" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select></Field>
          <Field label="Development stage"><select className="form-select" value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}>{STAGES.map(x=><option key={x}>{x}</option>)}</select></Field>
          <Field label="README / project description *" full><textarea rows="7" className="form-control" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Explain what the repository does, progress and contribution opportunities..."/></Field>
          <Field label="Topics / technologies" full><input className="form-control" value={form.tech} onChange={e=>setForm({...form,tech:e.target.value})} placeholder="React, Firebase, Python"/><small>Separate with commas.</small></Field>
          <Field label="Contributors wanted" full><input className="form-control" value={form.lookingFor} onChange={e=>setForm({...form,lookingFor:e.target.value})} placeholder="Frontend Developer, ML Developer, UI/UX"/></Field>
          <Field label="GitHub repository URL"><input className="form-control" value={form.githubUrl} onChange={e=>setForm({...form,githubUrl:e.target.value})} placeholder="https://github.com/user/repo"/></Field>
          <Field label="Homepage / live demo"><input className="form-control" value={form.projectUrl} onChange={e=>setForm({...form,projectUrl:e.target.value})} placeholder="https://project.example.com"/></Field>
          <Field full><label className="collaboration-switch"><input type="checkbox" checked={form.collaborationOpen} onChange={e=>setForm({...form,collaborationOpen:e.target.checked})}/><div><strong>Accept collaboration interests</strong><span>Other logged-in students will see “Show interest”.</span></div></label></Field>
        </div>
        {publishing&&projectImage&&<div className="upload-progress-wrap"><div className="d-flex justify-content-between"><span>Uploading...</span><strong>{uploadProgress}%</strong></div><div className="progress"><div className="progress-bar" style={{width:`${uploadProgress}%`}}/></div></div>}
      </div>
      <div className="portfolio-modal-footer"><button className="gh-btn" disabled={publishing} onClick={()=>setShowCreateModal(false)}>Cancel</button><button className="gh-btn gh-btn-green" disabled={publishing} onClick={publishProject}>{publishing?<><span className="spinner-border spinner-border-sm"/> Creating...</>:<><i className="bi bi-journal-plus"/> Create repository</>}</button></div>
    </div></div>}

    {interestProject && <div className="portfolio-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setInterestProject(null)}><div className="portfolio-modal interest-modal">
      <div className="portfolio-modal-header"><div><span className="gh-modal-kicker"><i className="bi bi-people"/> Collaboration</span><h2>Show interest</h2><p>{ownerName(interestProject)} / {interestProject.title}</p></div><button className="modal-close" onClick={()=>setInterestProject(null)}><i className="bi bi-x-lg"/></button></div>
      <div className="portfolio-modal-body">
        <div className="gh-interest-summary"><strong>What the owner is looking for</strong><div className="gh-topics">{arr(interestProject.lookingFor).length?arr(interestProject.lookingFor).map(x=><span key={x}>{x}</span>):<span>General collaborators</span>}</div></div>
        {myInterest && <div className={`existing-interest ${myInterest.status||"pending"}`}><i className={`bi ${myInterest.status==="accepted"?"bi-person-check-fill":myInterest.status==="declined"?"bi-x-circle-fill":"bi-clock-fill"}`}/><div><strong>Your interest is already submitted.</strong><span>Status: <b>{myInterest.status||"pending"}</b></span></div></div>}
        <Field label="Your skills"><input className="form-control" value={interestSkills} onChange={e=>setInterestSkills(e.target.value)} placeholder="React, Java, Python, Figma..."/></Field>
        <div className="mt-3"><Field label="Collaboration message *"><textarea rows="6" className="form-control" value={interestMessage} onChange={e=>setInterestMessage(e.target.value)} placeholder="Tell the owner how you can contribute..."/></Field></div>
      </div>
      <div className="portfolio-modal-footer">{myInterest&&<button className="gh-btn gh-btn-danger-outline me-auto" onClick={withdrawInterest}>Withdraw interest</button>}<button className="gh-btn" onClick={()=>setInterestProject(null)}>Cancel</button><button className="gh-btn gh-btn-green" disabled={sendingInterest||myInterest?.status==="accepted"} onClick={sendInterest}>{sendingInterest?"Sending...":myInterest?.status==="accepted"?"Already accepted":myInterest?"Update interest":"Submit interest"}</button></div>
    </div></div>}

    {requestProject && <div className="portfolio-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setRequestProject(null)}><div className="portfolio-modal request-modal">
      <div className="portfolio-modal-header"><div><span className="gh-modal-kicker"><i className="bi bi-people"/> Collaboration requests</span><h2>{requestProject.title}</h2><p>Review students who want to contribute.</p></div><button className="modal-close" onClick={()=>setRequestProject(null)}><i className="bi bi-x-lg"/></button></div>
      <div className="portfolio-modal-body">{requestsLoading?<div className="gh-empty small"><div className="spinner-border text-secondary"/><h3>Loading interests...</h3></div>:!interestRequests.length?<div className="gh-empty small"><i className="bi bi-people"/><h3>No interest requests yet</h3></div>:<div className="interest-request-list">{interestRequests.map(r=><article className="interest-request" key={r.id}>
        <div className="interest-person">{r.photo?<img src={r.photo} alt=""/>:<div className="avatar-placeholder">{initials(r.name)}</div>}<div><strong>{r.name}</strong><span>{r.email}</span></div><span className={`request-status ${r.status||"pending"}`}>{r.status||"pending"}</span></div>
        {r.skills?.length>0&&<div className="gh-topics mt-3">{r.skills.map(s=><span key={s}>{s}</span>)}</div>}<p className="request-message">{r.message}</p>
        {r.status==="pending"&&<div className="request-actions"><button className="gh-btn gh-btn-danger-outline" onClick={()=>updateInterestStatus(r,"declined")}>Decline</button><button className="gh-btn gh-btn-green" onClick={()=>updateInterestStatus(r,"accepted")}><i className="bi bi-check-lg"/> Accept</button></div>}
      </article>)}</div>}</div>
    </div></div>}

    {selectedProject && <div className="portfolio-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&closeProject()}><div className="portfolio-modal project-details-modal">
      <div className="gh-repo-modal-top"><div className="gh-repo-modal-breadcrumb"><i className="bi bi-book"/><span>{ownerName(selectedProject)}</span><span>/</span><strong>{selectedProject.title}</strong><span className="gh-public-badge">Public</span></div><button className="modal-close" onClick={closeProject}><i className="bi bi-x-lg"/></button></div>
      <div className="gh-repo-modal-tabs"><span className="active"><i className="bi bi-code"/> Code</span><span><i className="bi bi-people"/> Collaborators <b>{collaborators(selectedProject).length}</b></span></div>
      <div className="gh-repo-modal-body"><div className="gh-repo-detail-grid">
        <section>{selectedProject.imageUrl&&<div className="gh-detail-cover"><img src={selectedProject.imageUrl} alt={selectedProject.title||""}/></div>}
          <div className="gh-readme"><div className="gh-readme-head"><span><i className="bi bi-list"/> README.md</span><div>{selectedProject.githubUrl&&<a href={selectedProject.githubUrl} target="_blank" rel="noreferrer"><i className="bi bi-github"/> GitHub</a>}{selectedProject.projectUrl&&<a href={selectedProject.projectUrl} target="_blank" rel="noreferrer"><i className="bi bi-box-arrow-up-right"/> Demo</a>}</div></div>
          <div className="gh-readme-content"><h1>{selectedProject.title}</h1>{selectedProject.tagline&&<p className="lead">{selectedProject.tagline}</p>}<p className="full-project-description">{selectedProject.description}</p>{arr(selectedProject.tech).length>0&&<><h2>Tech stack</h2><div className="gh-topics large">{arr(selectedProject.tech).map(x=><span key={x}>{x}</span>)}</div></>}{arr(selectedProject.lookingFor).length>0&&<><h2>Contributors wanted</h2><ul>{arr(selectedProject.lookingFor).map(x=><li key={x}>{x}</li>)}</ul></>}</div></div>
        </section>
        <aside className="gh-about"><h3>About</h3><p>{selectedProject.tagline||selectedProject.description?.slice(0,180)||"Student repository on Techtroopers."}</p><div className="gh-about-links">{selectedProject.projectUrl&&<a href={selectedProject.projectUrl} target="_blank" rel="noreferrer"><i className="bi bi-link-45deg"/> Live project</a>}{selectedProject.githubUrl&&<a href={selectedProject.githubUrl} target="_blank" rel="noreferrer"><i className="bi bi-github"/> Repository</a>}</div>
          <h4>Topics</h4><div className="gh-topics">{arr(selectedProject.tech).length?arr(selectedProject.tech).map(x=><span key={x}>{x}</span>):<span>project</span>}</div>
          <div className="gh-about-stat"><i className="bi bi-star"/><span><b>{likeCount(selectedProject)}</b> stars</span></div><div className="gh-about-stat"><i className="bi bi-people"/><span><b>{interestCount(selectedProject)}</b> interested</span></div><div className="gh-about-stat"><i className="bi bi-person-check"/><span><b>{collaborators(selectedProject).length}</b> collaborators</span></div>
          <div className="gh-owner-card"><div className="gh-owner-row">{ownerPhoto(selectedProject)?<img src={ownerPhoto(selectedProject)} alt=""/>:<div className="avatar-placeholder">{initials(ownerName(selectedProject))}</div>}<div><strong>{ownerName(selectedProject)}</strong><span>Repository owner</span></div></div></div>
          {collaborators(selectedProject).length>0&&<><h4>Contributors</h4><div className="gh-contributors">{collaborators(selectedProject).map(c=><div key={c.uid||c.email||c.name} title={c.name}>{c.photo?<img src={c.photo} alt={c.name||""}/>:<span>{initials(c.name)}</span>}</div>)}</div></>}
          <div className="gh-about-actions">{isOwner(selectedProject,user)||isAdmin(user)?<><button className="gh-btn gh-btn-block" onClick={()=>{setSelectedProject(null);openRequests(selectedProject)}}><i className="bi bi-people"/> View interests</button><button className="gh-btn gh-btn-danger-outline gh-btn-block" disabled={deletingProjectId===selectedProject.id} onClick={()=>deleteProject(selectedProject)}><i className="bi bi-trash3"/> Delete repository</button></>:<button className={`gh-btn gh-btn-block ${myInterestMap[selectedProject.id]?.status==="accepted"?"gh-btn-success-soft":myInterestMap[selectedProject.id]?"gh-btn-blue-soft":collabOpen(selectedProject)?"gh-btn-green":""}`} disabled={!collabOpen(selectedProject)} onClick={()=>{setSelectedProject(null);openInterestModal(selectedProject)}}><i className="bi bi-person-plus"/>{myInterestMap[selectedProject.id]?.status==="accepted"?"Accepted collaborator":myInterestMap[selectedProject.id]?"View your interest":collabOpen(selectedProject)?"Show interest":"Collaboration closed"}</button>}<button className="gh-btn gh-btn-block" onClick={()=>shareProject(selectedProject)}><i className="bi bi-share"/> Share</button></div>
        </aside>
      </div></div>
    </div></div>}

    <style>{CSS}</style>
  </>;
}

function Field({ label, full, children }) {
  return <div className={`form-group-custom ${full ? "full" : ""}`}>{label && <label>{label}</label>}{children}</div>;
}

const CSS = `
:root{--gh-bg:#fff;--gh-canvas:#f6f8fa;--gh-border:#d0d7de;--gh-text:#1f2328;--gh-muted:#656d76;--gh-blue:#0969da;--gh-green:#1f883d;--gh-danger:#cf222e;--gh-topic-bg:#ddf4ff}
.gh-hero{background:#0d1117;color:#f0f6fc;border-bottom:1px solid #30363d;padding:48px 0 26px}.gh-hero-main{display:flex;justify-content:space-between;align-items:flex-end;gap:35px}.gh-kicker{display:flex;align-items:center;gap:8px;color:#8c959f;font-size:14px;font-weight:600;margin-bottom:12px}.gh-kicker i{font-size:22px;color:#fff}.gh-hero h1{margin:0;font-size:44px;line-height:1.08;letter-spacing:-1.3px;font-weight:650}.gh-hero p{max-width:760px;color:#8c959f;font-size:16px;line-height:1.7;margin:16px 0 0}.gh-hero-actions{display:flex;gap:8px;flex-wrap:wrap}.gh-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;margin-top:30px;background:#30363d;border:1px solid #30363d;border-radius:7px;overflow:hidden}.gh-summary>div{background:#161b22;padding:14px 17px;display:flex;justify-content:space-between;align-items:center}.gh-summary span{color:#8c959f;font-size:12px}.gh-summary strong{font-size:18px}
.gh-page{min-height:720px;background:#fff;color:var(--gh-text);padding-bottom:70px}.gh-tabs{display:flex;gap:2px;border-bottom:1px solid var(--gh-border);padding-top:16px;margin-bottom:16px;overflow-x:auto}.gh-tabs button{position:relative;border:0;background:transparent;display:flex;align-items:center;gap:6px;padding:10px 12px;font-size:14px;white-space:nowrap}.gh-tabs button.active{font-weight:600}.gh-tabs button.active:after{content:"";position:absolute;left:7px;right:7px;bottom:-1px;height:2px;background:#fd8c73}.gh-tabs button span,.gh-count{background:#afb8c133;border-radius:30px;padding:1px 7px;font-size:11px;font-weight:600}.gh-filterbar{display:grid;grid-template-columns:1fr 180px 150px auto auto;gap:8px;align-items:center}.gh-search{display:flex;align-items:center;gap:8px;min-height:34px;border:1px solid var(--gh-border);border-radius:6px;padding:0 10px}.gh-search:focus-within{border-color:var(--gh-blue);box-shadow:0 0 0 3px rgba(9,105,218,.12)}.gh-search input{border:0;outline:0;width:100%;min-height:32px;font-size:14px}.gh-filterbar .form-select{min-height:34px;border-color:var(--gh-border);border-radius:6px;font-size:13px;padding-top:4px;padding-bottom:4px}.gh-check{min-height:34px;border:1px solid var(--gh-border);border-radius:6px;display:flex;align-items:center;gap:7px;padding:0 10px;font-size:12px;white-space:nowrap}
.gh-btn{min-height:32px;border:1px solid rgba(31,35,40,.15);border-radius:6px;background:#f6f8fa;color:#24292f;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:5px 12px;font-size:13px;font-weight:600;text-decoration:none;cursor:pointer}.gh-btn:hover{background:#f3f4f6;color:#24292f}.gh-btn:disabled{opacity:.55;cursor:not-allowed}.gh-btn-green{background:var(--gh-green);color:#fff}.gh-btn-green:hover{background:#1a7f37;color:#fff}.gh-btn-block{width:100%}.gh-btn-blue-soft{color:#0969da;background:#ddf4ff}.gh-btn-success-soft{color:#1a7f37;background:#dafbe1}.gh-btn-danger-outline{color:var(--gh-danger)}.gh-btn-danger-outline:hover{background:var(--gh-danger);color:#fff;border-color:var(--gh-danger)}
.gh-repo-list{border-top:1px solid var(--gh-border);margin-top:16px}.gh-repo-row{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:26px;padding:23px 0;border-bottom:1px solid var(--gh-border)}.gh-repo-title-row{display:flex;align-items:center;justify-content:space-between;gap:15px}.gh-repo-title-row>div{display:flex;align-items:center;gap:8px;min-width:0}.gh-repo-title{border:0;background:transparent;padding:0;color:var(--gh-blue);font-size:19px;text-align:left;cursor:pointer;overflow-wrap:anywhere}.gh-repo-title:hover{text-decoration:underline}.gh-repo-title strong{font-weight:650}.gh-repo-title span{margin:0 3px}.gh-public-badge{border:1px solid var(--gh-border);border-radius:2em;padding:1px 7px;color:var(--gh-muted);font-size:12px;white-space:nowrap}.gh-icon-danger{width:32px;height:32px;border:1px solid var(--gh-border);background:#f6f8fa;color:var(--gh-danger);border-radius:6px;display:flex;align-items:center;justify-content:center}.gh-icon-danger:hover{background:var(--gh-danger);color:#fff}.gh-repo-description{max-width:760px;margin:10px 0 0;color:var(--gh-muted);font-size:14px;line-height:1.55}.gh-tagline{margin-top:7px;font-size:13px;font-weight:500}.gh-topics{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.gh-topics span{border-radius:2em;padding:3px 10px;background:var(--gh-topic-bg);color:var(--gh-blue);font-size:12px;font-weight:600}.gh-topics.large span{font-size:13px;padding:5px 11px}.gh-looking{margin-top:12px;display:flex;gap:8px;color:var(--gh-muted);font-size:12px}.gh-looking i{color:var(--gh-green)}.gh-looking b{color:var(--gh-text);margin-left:4px}.gh-repo-meta{display:flex;flex-wrap:wrap;gap:15px;margin-top:16px;color:var(--gh-muted);font-size:12px}.gh-repo-meta span,.gh-repo-meta button{display:inline-flex;align-items:center;gap:5px}.gh-repo-meta button{border:0;background:transparent;color:var(--gh-muted);padding:0;font-size:12px}.gh-repo-meta button.starred{color:#bf8700}.gh-repo-side{display:flex;flex-direction:column;gap:9px}.gh-cover-thumb{height:105px;border:1px solid var(--gh-border);border-radius:6px;overflow:hidden;padding:0;background:#f6f8fa}.gh-cover-thumb img{width:100%;height:100%;object-fit:cover}.gh-side-actions{display:flex;flex-direction:column;gap:7px}
.gh-empty{padding:65px 20px;text-align:center;color:var(--gh-muted);border:1px solid var(--gh-border);border-radius:6px;margin-top:18px}.gh-empty.small{margin:0;padding:40px 20px}.gh-empty>i{font-size:36px}.gh-empty h3{margin:11px 0 4px;font-size:18px;color:var(--gh-text)}.gh-empty p{margin:0;font-size:13px}
.portfolio-modal-backdrop{position:fixed;inset:0;z-index:100000;background:rgba(27,31,36,.55);display:flex;align-items:center;justify-content:center;padding:20px}.portfolio-modal{width:min(760px,96vw);max-height:94vh;background:#fff;border:1px solid var(--gh-border);border-radius:8px;overflow:hidden;display:flex;flex-direction:column}.create-project-modal{width:min(900px,96vw)}.portfolio-modal-header{display:flex;justify-content:space-between;gap:20px;padding:20px 24px;border-bottom:1px solid var(--gh-border);background:#f6f8fa}.portfolio-modal-header h2{margin:5px 0 2px;font-size:21px}.portfolio-modal-header p{margin:0;color:var(--gh-muted);font-size:13px}.gh-modal-kicker{display:flex;align-items:center;gap:7px;color:var(--gh-muted);font-size:12px;font-weight:600}.modal-close{width:32px;height:32px;border:0;border-radius:6px;background:transparent}.modal-close:hover{background:#afb8c133}.portfolio-modal-body{overflow:auto;padding:24px}.portfolio-modal-footer{padding:14px 24px;border-top:1px solid var(--gh-border);display:flex;justify-content:flex-end;gap:8px;background:#f6f8fa}.project-image-uploader{min-height:165px;background:#f6f8fa;border:1px dashed #8c959f;border-radius:6px;position:relative;overflow:hidden;margin-bottom:22px;display:flex;align-items:center;justify-content:center}.project-image-uploader>img{width:100%;max-height:300px;object-fit:cover}.upload-placeholder{display:flex;flex-direction:column;align-items:center;gap:5px;color:var(--gh-muted)}.upload-placeholder i{font-size:28px}.change-image-btn{position:absolute;right:12px;bottom:12px;border:1px solid var(--gh-border);border-radius:6px;background:#fff;padding:6px 11px;font-size:12px}.form-grid.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}.form-group-custom.full{grid-column:1/-1}.form-group-custom label{display:block;margin-bottom:6px;font-size:13px;font-weight:600}.form-group-custom .form-control,.form-group-custom .form-select{border-color:var(--gh-border);border-radius:6px;font-size:14px}.form-group-custom small{display:block;margin-top:5px;color:var(--gh-muted);font-size:12px}.collaboration-switch{display:flex!important;gap:10px;padding:13px;border:1px solid var(--gh-border);border-radius:6px;background:#f6f8fa}.collaboration-switch div{display:flex;flex-direction:column}.collaboration-switch span{color:var(--gh-muted);font-size:12px;font-weight:400}.upload-progress-wrap{margin-top:16px;font-size:12px}.gh-interest-summary{padding:14px;border:1px solid var(--gh-border);border-radius:6px;background:#f6f8fa;margin-bottom:18px}.existing-interest{display:flex;gap:10px;padding:12px 14px;border:1px solid #d4a72c66;border-radius:6px;background:#fff8c5;color:#6e4c00;margin-bottom:18px}.existing-interest.accepted{background:#dafbe1;color:#116329}.existing-interest.declined{background:#ffebe9;color:#82071e}.existing-interest div{display:flex;flex-direction:column;font-size:12px}.interest-request-list{display:flex;flex-direction:column;gap:12px}.interest-request{border:1px solid var(--gh-border);border-radius:6px;padding:16px}.interest-person{display:flex;align-items:center;gap:10px}.interest-person img{width:40px;height:40px;border-radius:50%;object-fit:cover}.interest-person>div:not(.avatar-placeholder){display:flex;flex-direction:column}.interest-person span{color:var(--gh-muted);font-size:12px}.avatar-placeholder{width:40px;height:40px;min-width:40px;border-radius:50%;background:#ddf4ff;color:#0969da;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700}.request-status{margin-left:auto;border:1px solid var(--gh-border);border-radius:2em;padding:3px 8px;text-transform:capitalize;font-size:11px!important}.request-status.pending{background:#fff8c5;color:#6e4c00!important}.request-status.accepted{background:#dafbe1;color:#116329!important}.request-status.declined{background:#ffebe9;color:#82071e!important}.request-message{margin:13px 0;font-size:13px;line-height:1.65;white-space:pre-line}.request-actions{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--gh-border);padding-top:12px}
.project-details-modal{width:min(1180px,97vw);max-height:96vh}.gh-repo-modal-top{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:15px 18px;background:#f6f8fa;border-bottom:1px solid var(--gh-border)}.gh-repo-modal-breadcrumb{display:flex;align-items:center;gap:8px;color:var(--gh-blue);font-size:18px;overflow-wrap:anywhere}.gh-repo-modal-tabs{display:flex;gap:5px;padding:0 14px;border-bottom:1px solid var(--gh-border);background:#f6f8fa}.gh-repo-modal-tabs span{position:relative;display:flex;align-items:center;gap:6px;padding:12px 10px;font-size:13px}.gh-repo-modal-tabs span.active{font-weight:600}.gh-repo-modal-tabs span.active:after{content:"";position:absolute;left:8px;right:8px;bottom:-1px;height:2px;background:#fd8c73}.gh-repo-modal-tabs b{background:#afb8c133;border-radius:2em;padding:1px 6px;font-size:11px}.gh-repo-modal-body{overflow:auto;padding:18px}.gh-repo-detail-grid{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px}.gh-detail-cover{max-height:360px;border:1px solid var(--gh-border);border-radius:6px;overflow:hidden;margin-bottom:16px;background:#f6f8fa}.gh-detail-cover img{width:100%;max-height:360px;object-fit:contain}.gh-readme{border:1px solid var(--gh-border);border-radius:6px;overflow:hidden}.gh-readme-head{min-height:46px;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:0 14px;border-bottom:1px solid var(--gh-border);background:#f6f8fa;font-size:13px;font-weight:600}.gh-readme-head>div{display:flex;gap:12px}.gh-readme-head a{color:var(--gh-blue);font-size:12px;text-decoration:none}.gh-readme-content{padding:28px 30px}.gh-readme-content h1{margin:0 0 16px;padding-bottom:9px;border-bottom:1px solid var(--gh-border);font-size:28px}.gh-readme-content h2{margin:28px 0 12px;padding-bottom:7px;border-bottom:1px solid var(--gh-border);font-size:20px}.full-project-description{white-space:pre-line;font-size:14px;line-height:1.7}.gh-about h3{margin:0 0 10px;font-size:16px}.gh-about h4{margin:22px 0 8px;font-size:13px}.gh-about p,.gh-about-links a,.gh-about-stat{font-size:13px}.gh-about-links{display:flex;flex-direction:column;gap:6px;margin:10px 0}.gh-about-links a{color:var(--gh-blue);text-decoration:none}.gh-about-stat{display:flex;align-items:center;gap:8px;margin-top:10px;color:var(--gh-muted)}.gh-owner-card{border-top:1px solid var(--gh-border);border-bottom:1px solid var(--gh-border);padding:14px 0;margin-top:20px}.gh-owner-row{display:flex;align-items:center;gap:10px}.gh-owner-row img{width:40px;height:40px;border-radius:50%;object-fit:cover}.gh-owner-row>div:not(.avatar-placeholder){display:flex;flex-direction:column}.gh-owner-row span{color:var(--gh-muted);font-size:12px}.gh-contributors{display:flex;flex-wrap:wrap;gap:5px}.gh-contributors>div{width:34px;height:34px;border-radius:50%;overflow:hidden;background:#ddf4ff}.gh-contributors img{width:100%;height:100%;object-fit:cover}.gh-contributors span{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#0969da;font-size:10px;font-weight:700}.gh-about-actions{display:flex;flex-direction:column;gap:8px;margin-top:20px}
@media(max-width:1000px){.gh-filterbar{grid-template-columns:1fr 1fr 1fr}.gh-search{grid-column:1/-1}.gh-repo-detail-grid{grid-template-columns:1fr}.gh-about{border-top:1px solid var(--gh-border);padding-top:20px}}
@media(max-width:800px){.gh-hero-main{align-items:flex-start;flex-direction:column}.gh-summary{grid-template-columns:1fr 1fr}.gh-repo-row{grid-template-columns:1fr}.gh-side-actions{display:grid;grid-template-columns:repeat(2,1fr)}.gh-cover-thumb{max-width:300px}}
@media(max-width:600px){.gh-hero h1{font-size:34px}.gh-summary,.gh-filterbar{grid-template-columns:1fr}.gh-search{grid-column:auto}.gh-repo-title-row{align-items:flex-start}.gh-repo-title-row>div{flex-wrap:wrap}.gh-side-actions{grid-template-columns:1fr}.portfolio-modal-backdrop{padding:6px}.portfolio-modal{width:100%;max-height:98vh}.form-grid.two{grid-template-columns:1fr}.form-group-custom.full{grid-column:auto}.gh-repo-modal-breadcrumb{font-size:14px}.gh-repo-modal-body{padding:10px}.gh-readme-content{padding:20px 17px}}
`;
