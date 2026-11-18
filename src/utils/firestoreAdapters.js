export const text = (value = '') => String(value ?? '').trim();

export const lower = (value = '') => text(value).toLowerCase();

export function normalizeExamDoc(e = {}) {
  const numQuestions = Math.max(0, Number(e.numQuestions ?? e.questions ?? 0) || 0);
  const marksPerQuestion = Math.max(0, Number(e.marksPerQuestion ?? 1) || 1);
  const configuredTotal = Number(e.totalMarks ?? e.marks ?? 0) || 0;
  const totalMarks = configuredTotal > 0
    ? configuredTotal
    : Math.max(0, numQuestions * marksPerQuestion);
  const categoryKey = text(e.category || e.name || e.title || e.code || e.examCode || e.id);
  const title = text(e.title || e.name || e.category || e.code || 'Online Examination');

  return {
    ...e,
    title,
    name: text(e.name || title),
    subject: text(e.subject || e.name || e.category || title),
    category: categoryKey,
    categoryKey,
    code: text(e.code || e.examCode || e.name || e.category || e.id),
    questions: numQuestions || Number(e.questionCount || 0) || 0,
    numQuestions: numQuestions || Number(e.questionCount || 0) || 0,
    marksPerQuestion,
    marks: totalMarks,
    totalMarks,
    duration: Math.max(1, Number(e.timer ?? e.duration ?? 45) || 45),
    timer: Math.max(1, Number(e.timer ?? e.duration ?? 45) || 45),
    status: e.status || (e.isActive === false ? 'Closed' : 'Available'),
    level: e.level || 'Intermediate',
    startCode: text(e.startCode || (Array.isArray(e.secretCodes) ? e.secretCodes[0] : '')),
    secretCodes: Array.isArray(e.secretCodes)
      ? e.secretCodes.map(text).filter(Boolean)
      : text(e.startCode) ? [text(e.startCode)] : [],
    showAnswerKey: Boolean(e.showAnswerKey),
  };
}

export function normalizeQuestionDoc(q = {}) {
  const options = Array.isArray(q.options)
    ? q.options
    : [q.optionA, q.optionB, q.optionC, q.optionD].filter(v => v !== undefined);
  return {
    ...q,
    question: text(q.question || q.ques || q.questionText),
    options,
    answer: Number(q.answer ?? q.correctAnswer ?? 0),
    category: text(q.category || q.examCategory || q.examId),
    examId: text(q.examId || ''),
    explanation: text(q.getQuesDesc || q.explanation || q.answerDescription),
    getQuesDesc: text(q.getQuesDesc || q.explanation || q.answerDescription),
  };
}

export function questionMatchesExam(q = {}, exam = {}) {
  const nq = normalizeQuestionDoc(q);
  const candidates = [
    exam.id,
    exam.category,
    exam.categoryKey,
    exam.name,
    exam.title,
    exam.code,
  ].map(lower).filter(Boolean);
  const qValues = [nq.category, nq.examId].map(lower).filter(Boolean);
  return qValues.some(v => candidates.includes(v));
}

export function normalizeBookFile(b = {}) {
  const categoryName = text(b.categoryName || b.category || b.mainCategory || 'Learning');
  const subCat = text(b.subCat || b.subCategory || b.type || 'E-Book');
  const fileUrl = text(b.fileUrl || b.url || b.downloadUrl || b.pdfUrl);
  return {
    ...b,
    title: text(b.title || b.name || 'Untitled Resource'),
    categoryId: text(b.categoryId || ''),
    categoryName,
    category: categoryName,
    subCat,
    type: subCat,
    fileUrl,
    url: fileUrl,
    price: b.price ?? '',
    code: text(b.code || subCat),
    author: text(b.author || 'TechTroopers'),
    description: text(b.description || `${categoryName}${subCat ? ` • ${subCat}` : ''}`),
    status: b.status || 'Published',
  };
}

export function normalizeBookCategory(c = {}) {
  return {
    ...c,
    category: text(c.category || c.name || c.title),
    description: text(c.description || ''),
  };
}

export function normalizeJobPost(v = {}) {
  const skills = Array.isArray(v.skills)
    ? v.skills
    : text(v.skills).split(',').map(x => x.trim()).filter(Boolean);
  const status = v.status || (v.isActive === false ? 'Closed' : 'Open');
  return {
    ...v,
    title: text(v.title || v.jobTitle || v.role || v.designation || v.category || 'Opportunity'),
    company: text(v.company || v.companyName || 'Company'),
    location: text(v.location || 'Remote / Not specified'),
    type: text(v.jobType || v.type || 'Opportunity'),
    jobType: text(v.jobType || v.type || 'Opportunity'),
    experienceLevel: text(v.experienceLevel || v.experience || ''),
    description: text(v.description || v.details || ''),
    skills,
    stipend: text(v.stipend || v.salary || v.ctc || v.pay || ''),
    deadline: text(v.deadline || v.lastDate || ''),
    status,
    isActive: v.isActive !== false && lower(status) !== 'closed' && lower(status) !== 'draft',
    applyMode: text(v.applyMode || 'portal'),
    companyEmail: text(v.companyEmail || ''),
    companyPhone: text(v.companyPhone || ''),
  };
}

export function normalizeCommunityPost(p = {}) {
  return {
    ...p,
    author: text(p.authorName || p.author || 'TechTroopers'),
    authorName: text(p.authorName || p.author || 'TechTroopers'),
    authorEmail: text(p.authorEmail || ''),
    authorPhoto: text(p.authorPhoto || ''),
    uid: text(p.authorUid || p.uid || ''),
    authorUid: text(p.authorUid || p.uid || ''),
    title: text(p.title || 'Community Update'),
    body: text(p.content || p.body || ''),
    content: text(p.content || p.body || ''),
    likes: Number(p.likesCount ?? p.likes ?? 0) || 0,
    likesCount: Number(p.likesCount ?? p.likes ?? 0) || 0,
    comments: Number(p.commentsCount ?? p.comments ?? 0) || 0,
    commentsCount: Number(p.commentsCount ?? p.comments ?? 0) || 0,
    likedBy: Array.isArray(p.likedBy) ? p.likedBy : [],
    tags: Array.isArray(p.tags) ? p.tags : text(p.tags).split(',').map(x => x.trim()).filter(Boolean),
    status: p.status || 'Published',
  };
}

export const displayDate = (value) => {
  if (!value) return '';
  try {
    if (value?.toDate) return value.toDate().toLocaleDateString();
    if (value?.seconds) return new Date(value.seconds * 1000).toLocaleDateString();
    return new Date(value).toLocaleDateString();
  } catch {
    return '';
  }
};
