import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
} from 'firebase/storage';

import PageMeta from '../components/PageMeta';
import { posts as seed } from '../data/demoData';
import { useAuth } from '../contexts/AuthContext';
import { db, storage } from '../config/firebase';
import { displayDate, normalizeCommunityPost } from '../utils/firestoreAdapters';

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

function toMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value?.seconds) return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeUrl(value = '') {
  const raw = value.trim();
  if (!raw) return '';
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withProtocol);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http/https links are allowed.');
  }
  return parsed.toString();
}

function extractFirstLink(value = '') {
  const match = value.match(/https?:\/\/[^\s]+/i);
  return match?.[0] || '';
}

function linkHost(value = '') {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return 'External link';
  }
}

function safeFileName(name = 'image') {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
}

function initials(name = 'TT') {
  return String(name || 'TT')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getTagsFromText(value = '') {
  const matches = String(value).match(/#[a-zA-Z0-9_+-]+/g) || [];
  return [...new Set(matches.map((tag) => tag.replace('#', '')))].slice(0, 8);
}

function getPostType(post = {}) {
  return post.postType || post.type || 'Update';
}

function relativeDate(value) {
  const ms = toMillis(value);
  if (!ms) return displayDate(value) || 'Just now';
  const diff = Date.now() - ms;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m ago`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))}h ago`;
  if (diff < day * 7) return `${Math.max(1, Math.floor(diff / day))}d ago`;
  return displayDate(value) || 'Recently';
}

export default function TroopersTalk() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [text, setText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [activePostId, setActivePostId] = useState('');
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentPosting, setCommentPosting] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyPosting, setReplyPosting] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const [imageViewer, setImageViewer] = useState('');
  const [postModalId, setPostModalId] = useState('');

  // LinkedIn-style feed controls
  const [composerOpen, setComposerOpen] = useState(false);
  const [postType, setPostType] = useState('Update');
  const [audience, setAudience] = useState('Community');
  const [feedFilter, setFeedFilter] = useState('All');
  const [feedSort, setFeedSort] = useState('Latest');
  const [search, setSearch] = useState('');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ttSavedPosts') || '[]');
    } catch {
      return [];
    }
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    localStorage.setItem('ttSavedPosts', JSON.stringify(savedPostIds));
  }, [savedPostIds]);

  const toggleSave = (postId) => {
    setSavedPostIds((current) => {
      if (current.includes(postId)) {
        toast.success('Removed from saved posts.');
        return current.filter((id) => id !== postId);
      }
      toast.success('Post saved.');
      return [...current, postId];
    });
  };

  /* =====================================================
     LIVE POSTS
  ===================================================== */
  useEffect(() => {
    setLoading(true);
    setError('');

    const unsubscribe = onSnapshot(
      collection(db, 'posts'),
      (snapshot) => {
        const rows = snapshot.docs
          .map((snap) => normalizeCommunityPost({ id: snap.id, ...snap.data() }))
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

        setPosts(rows);
        setLoading(false);
      },
      (err) => {
        console.error('TroopersTalk read error:', err);
        setError(err?.message || 'Could not read TroopersTalk posts.');
        setPosts((seed || []).map(normalizeCommunityPost));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  /* =====================================================
     IMAGE PREVIEW
  ===================================================== */
  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return undefined;
    }

    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);

    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  /* =====================================================
     SHARED POST MODAL IS OPENED AFTER COMMENT HELPERS
     ARE DECLARED BELOW. BOTH ?post=ID AND OLD #post-ID
     LINKS ARE SUPPORTED.
  ===================================================== */

  const visible = useMemo(
    () => posts.filter((post) => post.status !== 'Hidden' && post.status !== 'Draft'),
    [posts]
  );

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = visible.filter((post) => {
      const type = getPostType(post);
      const typeOk = feedFilter === 'All' || type === feedFilter;
      const savedOk = !showSavedOnly || savedPostIds.includes(post.id);
      const textSearch = [
        post.author,
        post.authorEmail,
        post.title,
        post.body,
        post.content,
        type,
        ...(post.tags || []),
      ].filter(Boolean).join(' ').toLowerCase();
      return typeOk && savedOk && (!q || textSearch.includes(q));
    });

    if (feedSort === 'Trending') {
      rows = [...rows].sort((a, b) => {
        const scoreA = Number(a.likesCount || 0) * 2 + Number(a.commentsCount || 0) * 3;
        const scoreB = Number(b.likesCount || 0) * 2 + Number(b.commentsCount || 0) * 3;
        return scoreB - scoreA;
      });
    } else {
      rows = [...rows].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    }
    return rows;
  }, [visible, search, feedFilter, feedSort, showSavedOnly, savedPostIds]);

  const trendingTags = useMemo(() => {
    const counts = {};
    visible.forEach((post) => {
      const tags = [...(post.tags || []), ...getTagsFromText(post.body || post.content || '')];
      tags.forEach((tag) => {
        const clean = String(tag).replace('#', '').trim();
        if (clean) counts[clean] = (counts[clean] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [visible]);

  const communityStats = useMemo(() => {
    const authors = new Set(visible.map((post) => post.authorUid).filter(Boolean));
    return {
      posts: visible.length,
      members: authors.size,
      comments: visible.reduce((sum, post) => sum + Number(post.commentsCount || 0), 0),
    };
  }, [visible]);

  const currentPost = useMemo(
    () => visible.find((post) => post.id === activePostId) || null,
    [visible, activePostId]
  );

  const modalPost = useMemo(
    () => visible.find((post) => post.id === postModalId) || null,
    [visible, postModalId]
  );

  /* =====================================================
     IMAGE UPLOAD
  ===================================================== */
  const uploadPostImage = async (file) => {
    if (!user?.uid) throw new Error('Please login first.');

    const path = `troopersTalk/${user.uid}/posts/${Date.now()}_${safeFileName(file.name)}`;
    const ref = storageRef(storage, path);

    const url = await new Promise((resolve, reject) => {
      const task = uploadBytesResumable(ref, file, {
        contentType: file.type,
      });

      task.on(
        'state_changed',
        (snapshot) => {
          const percent = snapshot.totalBytes
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
          setUploadProgress(percent);
        },
        reject,
        async () => {
          const downloadUrl = await getDownloadURL(task.snapshot.ref);
          resolve(downloadUrl);
        }
      );
    });

    return { url, path };
  };

  const handleImagePick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image must be smaller than 8 MB.');
      return;
    }

    setImageFile(file);
  };

  /* =====================================================
     CREATE POST
  ===================================================== */
  const publish = async () => {
    if (!user) {
      toast.error('Please login to post.');
      return;
    }

    const cleanText = text.trim();
    if (!cleanText && !imageFile && !linkUrl.trim()) {
      toast.error('Write something, add an image, or attach a link.');
      return;
    }

    setPosting(true);
    setUploadProgress(0);

    let uploadedImage = null;

    try {
      let cleanLink = '';
      const rawLink = linkUrl.trim() || extractFirstLink(cleanText);
      if (rawLink) cleanLink = normalizeUrl(rawLink);

      if (imageFile) {
        uploadedImage = await uploadPostImage(imageFile);
      }

      await addDoc(collection(db, 'posts'), {
        authorEmail: user.email || '',
        authorName: user.name || user.displayName || user.email || 'Member',
        authorPhoto: user.photoURL || user.photo || '',
        authorUid: user.uid,
        content: cleanText,
        postType,
        audience,
        tags: getTagsFromText(cleanText),
        imageUrl: uploadedImage?.url || '',
        imagePath: uploadedImage?.path || '',
        linkUrl: cleanLink,
        commentsCount: 0,
        likesCount: 0,
        likedBy: [],
        status: 'Published',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setText('');
      setLinkUrl('');
      setShowLinkInput(false);
      setImageFile(null);
      setUploadProgress(0);
      setPostType('Update');
      setAudience('Community');
      setComposerOpen(false);
      toast.success('Posted to TroopersTalk.');
    } catch (err) {
      console.error('Publish error:', err);
      if (uploadedImage?.path) {
        try {
          await deleteObject(storageRef(storage, uploadedImage.path));
        } catch {
          // Ignore cleanup failure.
        }
      }
      toast.error(err?.message || 'Unable to publish post.');
    } finally {
      setPosting(false);
    }
  };

  /* =====================================================
     LIKE / UNLIKE POST - ATOMIC
  ===================================================== */
  const toggleLike = async (post) => {
    if (!user) {
      toast.error('Please login to like posts.');
      return;
    }

    try {
      const ref = doc(db, 'posts', post.id);

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error('This post no longer exists.');

        const data = snap.data();
        const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
        const alreadyLiked = likedBy.includes(user.uid);
        const nextLikedBy = alreadyLiked
          ? likedBy.filter((uid) => uid !== user.uid)
          : [...likedBy, user.uid];

        transaction.update(ref, {
          likedBy: nextLikedBy,
          likesCount: nextLikedBy.length,
          updatedAt: serverTimestamp(),
        });
      });
    } catch (err) {
      toast.error(err?.message || 'Could not update like.');
    }
  };

  /* =====================================================
     SHARE
  ===================================================== */
  const buildPostShareUrl = (postId) => {
    const url = new URL(window.location.href);
    url.hash = '';
    url.searchParams.set('post', postId);
    return url.toString();
  };

  const sharePost = async (post) => {
    const url = buildPostShareUrl(post.id);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `TroopersTalk · ${post.author}`,
          text: post.body?.slice(0, 120) || 'View this TroopersTalk post',
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Post link copied. Anyone opening it will see this post in a popup.');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error('Could not share this post.');
    }
  };

  /* =====================================================
     COMMENTS + REPLIES
  ===================================================== */
  const loadComments = async (postId, { silent = false } = {}) => {
    if (!silent) setCommentsLoading(true);

    try {
      const commentsSnap = await getDocs(collection(db, 'posts', postId, 'comments'));

      const rows = await Promise.all(
        commentsSnap.docs.map(async (commentSnap) => {
          const data = commentSnap.data();
          const repliesSnap = await getDocs(
            collection(db, 'posts', postId, 'comments', commentSnap.id, 'replies')
          );

          const firestoreReplies = repliesSnap.docs.map((replySnap) => ({
            id: replySnap.id,
            ...replySnap.data(),
          }));

          const legacyReplies = Array.isArray(data.replies) ? data.replies : [];
          const replies = [...firestoreReplies, ...legacyReplies].sort(
            (a, b) => toMillis(a.createdAt) - toMillis(b.createdAt)
          );

          return {
            id: commentSnap.id,
            ...data,
            content: data.content || data.text || data.comment || '',
            authorName: data.authorName || data.name || data.authorEmail || 'Member',
            authorPhoto: data.authorPhoto || '',
            authorUid: data.authorUid || data.uid || '',
            replies,
          };
        })
      );

      rows.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
      setComments(rows);
    } catch (err) {
      console.error('Comment loading error:', err);
      toast.error(err?.message || 'Could not load comments.');
    } finally {
      if (!silent) setCommentsLoading(false);
    }
  };

  const toggleComments = async (postId) => {
    if (activePostId === postId) {
      setActivePostId('');
      setComments([]);
      setCommentText('');
      setReplyTarget(null);
      setReplyText('');
      return;
    }

    setActivePostId(postId);
    setComments([]);
    setCommentText('');
    setReplyTarget(null);
    setReplyText('');
    await loadComments(postId);
  };

  const openPostModal = async (postId, { updateUrl = false } = {}) => {
    if (!postId) return;

    setPostModalId(postId);
    setActivePostId(postId);
    setComments([]);
    setCommentText('');
    setReplyTarget(null);
    setReplyText('');

    if (updateUrl) {
      const next = new URL(window.location.href);
      next.hash = '';
      next.searchParams.set('post', postId);
      window.history.pushState({}, '', next);
    }

    await loadComments(postId);
  };

  const closePostModal = () => {
    const closingId = postModalId;
    setPostModalId('');
    setActivePostId((current) => (current === closingId ? '' : current));
    setComments([]);
    setCommentText('');
    setReplyTarget(null);
    setReplyText('');

    const next = new URL(window.location.href);
    next.hash = '';
    next.searchParams.delete('post');
    window.history.replaceState({}, '', next);
  };

  useEffect(() => {
    if (!visible.length) return undefined;

    const openFromLocation = () => {
      const url = new URL(window.location.href);
      const queryId = url.searchParams.get('post');
      const hashId = url.hash.startsWith('#post-') ? url.hash.replace('#post-', '') : '';
      const id = queryId || hashId;

      if (!id) return;
      if (!visible.some((post) => post.id === id)) return;

      openPostModal(id);
    };

    openFromLocation();
    window.addEventListener('popstate', openFromLocation);
    window.addEventListener('hashchange', openFromLocation);

    return () => {
      window.removeEventListener('popstate', openFromLocation);
      window.removeEventListener('hashchange', openFromLocation);
    };
    // Re-check when Firestore delivers the posts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.length]);

  useEffect(() => {
    if (!postModalId) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closePostModal();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postModalId]);

  const adjustPostCommentCount = async (postId, delta) => {
    const postRef = doc(db, 'posts', postId);

    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(postRef);
        if (!snap.exists()) return;
        const current = Number(snap.data().commentsCount || 0);
        transaction.update(postRef, {
          commentsCount: Math.max(0, current + delta),
          updatedAt: serverTimestamp(),
        });
      });
    } catch (err) {
      console.warn('Could not adjust commentsCount:', err);
    }
  };

  const addComment = async () => {
    if (!user) {
      toast.error('Please login to comment.');
      return;
    }
    if (!activePostId || !commentText.trim()) return;

    setCommentPosting(true);

    try {
      await addDoc(collection(db, 'posts', activePostId, 'comments'), {
        authorUid: user.uid,
        authorName: user.name || user.displayName || user.email || 'Member',
        authorEmail: user.email || '',
        authorPhoto: user.photoURL || user.photo || '',
        content: commentText.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await adjustPostCommentCount(activePostId, 1);
      setCommentText('');
      await loadComments(activePostId, { silent: true });
    } catch (err) {
      toast.error(err?.message || 'Could not add comment.');
    } finally {
      setCommentPosting(false);
    }
  };

  const addReply = async (commentId) => {
    if (!user) {
      toast.error('Please login to reply.');
      return;
    }
    if (!activePostId || !commentId || !replyText.trim()) return;

    setReplyPosting(true);

    try {
      await addDoc(
        collection(db, 'posts', activePostId, 'comments', commentId, 'replies'),
        {
          authorUid: user.uid,
          authorName: user.name || user.displayName || user.email || 'Member',
          authorEmail: user.email || '',
          authorPhoto: user.photoURL || user.photo || '',
          content: replyText.trim(),
          replyToName: replyTarget?.replyToName || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      await adjustPostCommentCount(activePostId, 1);
      setReplyText('');
      setReplyTarget(null);
      await loadComments(activePostId, { silent: true });
    } catch (err) {
      toast.error(err?.message || 'Could not add reply.');
    } finally {
      setReplyPosting(false);
    }
  };

  /* =====================================================
     DELETE COMMENT / REPLY / POST
  ===================================================== */
  const canDeleteAuthorItem = (authorUid) => Boolean(user && (isAdmin || authorUid === user.uid));

  const deleteReply = async (commentId, reply) => {
    if (!activePostId || !canDeleteAuthorItem(reply.authorUid)) return;
    if (!window.confirm('Delete this reply?')) return;

    const key = `reply-${reply.id}`;
    setDeletingId(key);

    try {
      await deleteDoc(
        doc(db, 'posts', activePostId, 'comments', commentId, 'replies', reply.id)
      );
      await adjustPostCommentCount(activePostId, -1);
      await loadComments(activePostId, { silent: true });
      toast.success('Reply deleted.');
    } catch (err) {
      toast.error(err?.message || 'Could not delete reply.');
    } finally {
      setDeletingId('');
    }
  };

  const deleteComment = async (comment) => {
    if (!activePostId || !canDeleteAuthorItem(comment.authorUid)) return;
    if (!window.confirm('Delete this comment and all replies under it?')) return;

    const key = `comment-${comment.id}`;
    setDeletingId(key);

    try {
      const repliesSnap = await getDocs(
        collection(db, 'posts', activePostId, 'comments', comment.id, 'replies')
      );

      await Promise.all(
        repliesSnap.docs.map((replySnap) =>
          deleteDoc(
            doc(db, 'posts', activePostId, 'comments', comment.id, 'replies', replySnap.id)
          )
        )
      );

      await deleteDoc(doc(db, 'posts', activePostId, 'comments', comment.id));
      await adjustPostCommentCount(activePostId, -(repliesSnap.size + 1));
      await loadComments(activePostId, { silent: true });
      toast.success('Comment deleted.');
    } catch (err) {
      toast.error(err?.message || 'Could not delete comment.');
    } finally {
      setDeletingId('');
    }
  };

  const deletePost = async (post) => {
    if (!canDeleteAuthorItem(post.authorUid)) return;
    if (!window.confirm('Delete this post, its comments and replies?')) return;

    const key = `post-${post.id}`;
    setDeletingId(key);

    try {
      const commentsSnap = await getDocs(collection(db, 'posts', post.id, 'comments'));

      for (const commentSnap of commentsSnap.docs) {
        const repliesSnap = await getDocs(
          collection(db, 'posts', post.id, 'comments', commentSnap.id, 'replies')
        );

        await Promise.all(
          repliesSnap.docs.map((replySnap) =>
            deleteDoc(
              doc(db, 'posts', post.id, 'comments', commentSnap.id, 'replies', replySnap.id)
            )
          )
        );

        await deleteDoc(doc(db, 'posts', post.id, 'comments', commentSnap.id));
      }

      await deleteDoc(doc(db, 'posts', post.id));

      if (post.imagePath) {
        try {
          await deleteObject(storageRef(storage, post.imagePath));
        } catch (storageError) {
          console.warn('Image cleanup skipped:', storageError?.message || storageError);
        }
      }

      if (activePostId === post.id) {
        setActivePostId('');
        setComments([]);
      }

      if (postModalId === post.id) {
        closePostModal();
      }

      toast.success('Post deleted.');
    } catch (err) {
      toast.error(err?.message || 'Could not delete post.');
    } finally {
      setDeletingId('');
    }
  };


  /* =====================================================
     QUESTION: MARK SOLVED
  ===================================================== */
  const toggleSolved = async (post) => {
    if (!user || post.authorUid !== user.uid) return;
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        solved: !post.solved,
        updatedAt: serverTimestamp(),
      });
      toast.success(post.solved ? 'Question reopened.' : 'Question marked solved.');
    } catch (err) {
      toast.error(err?.message || 'Could not update question.');
    }
  };


  return (
    <>
      <PageMeta title="TroopersTalk" />

      {/* No hero/header by request: the page starts directly with the social feed. */}
      <main className="ln-page">
        <div className="container-xxl ln-shell">
          {/* ========================= LEFT ========================= */}
          <aside className="ln-left">
            <div className="ln-profile-card">
              <div className="ln-cover" />
              <div className="ln-profile-main">
                <Avatar
                  src={user?.photoURL || user?.photo || ''}
                  name={user?.name || user?.displayName || user?.email || 'TroopersTalk'}
                  size={76}
                />
                <h3>{user?.name || user?.displayName || 'TroopersTalk'}</h3>
                <p>{user?.email || 'Learn, share and collaborate with TechTroopers.'}</p>
              </div>

              <div className="ln-profile-metrics">
                <button onClick={() => { setShowSavedOnly(false); setFeedFilter('All'); }}>
                  <span>Community posts</span><b>{communityStats.posts}</b>
                </button>
                <button onClick={() => setShowSavedOnly(true)}>
                  <span>Saved items</span><b>{savedPostIds.length}</b>
                </button>
              </div>

              <button className="ln-bookmark-link" onClick={() => setShowSavedOnly((v) => !v)}>
                <i className="bi bi-bookmark-fill" />
                <span>{showSavedOnly ? 'Back to all posts' : 'My saved posts'}</span>
              </button>
            </div>

            <div className="ln-side-card">
              <h4>Quick filters</h4>
              {[
                ['Question','bi-patch-question'],
                ['Project','bi-kanban'],
                ['Achievement','bi-trophy'],
                ['Opportunity','bi-briefcase'],
              ].map(([label, icon]) => (
                <button key={label} onClick={() => setFeedFilter(label)}>
                  <i className={`bi ${icon}`} />
                  <span>{label}s</span>
                </button>
              ))}
            </div>
          </aside>

          {/* ========================= CENTER ========================= */}
          <section className="ln-center">
            <div className="ln-composer-card">
              <div className="ln-composer-row">
                <Avatar
                  src={user?.photoURL || user?.photo || ''}
                  name={user?.name || user?.displayName || user?.email || 'You'}
                  size={48}
                />
                <button
                  className="ln-start-post"
                  onClick={() => {
                    if (!user) return toast.error('Please login to post.');
                    setComposerOpen(true);
                  }}
                >
                  Start a post
                </button>
              </div>

              <div className="ln-composer-actions">
                <button onClick={() => { if (!user) return toast.error('Please login to post.'); setComposerOpen(true); setTimeout(() => fileInputRef.current?.click(), 150); }}>
                  <i className="bi bi-image text-primary" /> Photo
                </button>
                <button onClick={() => { if (!user) return toast.error('Please login to post.'); setPostType('Project'); setComposerOpen(true); }}>
                  <i className="bi bi-kanban text-success" /> Project
                </button>
                <button onClick={() => { if (!user) return toast.error('Please login to post.'); setPostType('Achievement'); setComposerOpen(true); }}>
                  <i className="bi bi-trophy text-warning" /> Achievement
                </button>
                <button onClick={() => { if (!user) return toast.error('Please login to post.'); setPostType('Question'); setComposerOpen(true); }}>
                  <i className="bi bi-patch-question text-danger" /> Ask
                </button>
              </div>
            </div>

            <div className="ln-feed-tools">
              <div className="ln-search">
                <i className="bi bi-search" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search people, posts, skills or #topics"
                />
                {search && <button onClick={() => setSearch('')}><i className="bi bi-x-lg" /></button>}
              </div>
              <div className="ln-tool-selects">
                <select value={feedFilter} onChange={(e) => setFeedFilter(e.target.value)}>
                  <option value="All">All posts</option>
                  <option value="Question">Questions</option>
                  <option value="Project">Projects</option>
                  <option value="Achievement">Achievements</option>
                  <option value="Opportunity">Opportunities</option>
                </select>
                <select value={feedSort} onChange={(e) => setFeedSort(e.target.value)}>
                  <option>Latest</option>
                  <option>Trending</option>
                </select>
              </div>
            </div>

            {showSavedOnly && (
              <div className="ln-saved-banner">
                <span><i className="bi bi-bookmark-fill" /> Saved posts</span>
                <button onClick={() => setShowSavedOnly(false)}>Show all</button>
              </div>
            )}

            {error && <div className="alert alert-warning">{error}</div>}

            <div className="ln-feed-list">
              {loading && (
                <div className="ln-empty">
                  <div className="spinner-border text-primary" />
                  <p>Loading feed...</p>
                </div>
              )}

              {!loading && !filteredPosts.length && (
                <div className="ln-empty">
                  <i className="bi bi-chat-square-text" />
                  <h3>No posts found</h3>
                  <p>Try a different filter or start a new conversation.</p>
                </div>
              )}

              {filteredPosts.map((post) => {
                const liked = Boolean(user?.uid && post.likedBy?.includes(user.uid));
                const saved = savedPostIds.includes(post.id);
                const postLink = post.linkUrl || extractFirstLink(post.body || '');
                const canDelete = canDeleteAuthorItem(post.authorUid);
                const type = getPostType(post);

                return (
                  <article className="ln-post-card" key={post.id} id={`post-${post.id}`}>
                    <div className="ln-post-header">
                      <div className="ln-post-author">
                        <Avatar src={post.authorPhoto} name={post.author} size={50} />
                        <div>
                          <div className="ln-author-name">
                            <strong>{post.author}</strong>
                            <span>• 1st</span>
                          </div>
                          <small>{post.authorEmail || 'TechTroopers member'}</small>
                          <small>{relativeDate(post.createdAt)} • <i className="bi bi-globe2" /></small>
                        </div>
                      </div>

                      <div className="ln-post-tools">
                        <span className={`ln-post-type type-${type.toLowerCase()}`}>{type}</span>
                        <button onClick={() => toggleSave(post.id)} title={saved ? 'Remove from saved' : 'Save post'}>
                          <i className={`bi ${saved ? 'bi-bookmark-fill' : 'bi-bookmark'}`} />
                        </button>
                        {canDelete && (
                          <button className="danger" onClick={() => deletePost(post)} disabled={deletingId === `post-${post.id}`}>
                            {deletingId === `post-${post.id}` ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-trash3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {post.title && post.title !== 'Community Update' && <h3 className="ln-post-title">{post.title}</h3>}
                    {!!post.body && <p className="ln-post-body">{post.body}</p>}

                    {!!post.tags?.length && (
                      <div className="ln-tags">
                        {post.tags.map((tag) => <button key={tag} onClick={() => setSearch(`#${tag}`)}>#{tag}</button>)}
                      </div>
                    )}

                    {type === 'Question' && post.solved && (
                      <div className="ln-solved"><i className="bi bi-check-circle-fill" /> Solved question</div>
                    )}

                    {!!post.imageUrl && (
                      <button className="ln-post-image" onClick={() => setImageViewer(post.imageUrl)} aria-label="Open image">
                        <img src={post.imageUrl} alt="Post attachment" loading="lazy" />
                      </button>
                    )}

                    {!!postLink && (
                      <a className="ln-link-card" href={postLink} target="_blank" rel="noreferrer">
                        <div className="ln-link-icon"><i className="bi bi-link-45deg" /></div>
                        <div><span>{linkHost(postLink)}</span><strong>{postLink}</strong></div>
                        <i className="bi bi-box-arrow-up-right" />
                      </a>
                    )}

                    <div className="ln-social-counts">
                      <div>
                        {(post.likesCount || 0) > 0 && <><span className="ln-like-dot"><i className="bi bi-hand-thumbs-up-fill" /></span><span>{post.likesCount}</span></>}
                      </div>
                      <button onClick={() => toggleComments(post.id)}>{post.commentsCount || 0} comments</button>
                    </div>

                    <div className="ln-post-actions">
                      <button className={liked ? 'liked' : ''} onClick={() => toggleLike(post)}>
                        <i className={`bi ${liked ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'}`} /> Like
                      </button>
                      <button onClick={() => toggleComments(post.id)}><i className="bi bi-chat-text" /> Comment</button>
                      <button onClick={() => sharePost(post)}><i className="bi bi-arrow-repeat" /> Share</button>
                      {type === 'Question' && post.authorUid === user?.uid && (
                        <button className={post.solved ? 'solved' : ''} onClick={() => toggleSolved(post)}>
                          <i className="bi bi-check2-circle" /> {post.solved ? 'Reopen' : 'Solved'}
                        </button>
                      )}
                    </div>

                    {activePostId === post.id && (
                      <CommentsPanel
                        post={currentPost || post}
                        user={user}
                        isAdmin={isAdmin}
                        comments={comments}
                        loading={commentsLoading}
                        commentText={commentText}
                        setCommentText={setCommentText}
                        commentPosting={commentPosting}
                        onAddComment={addComment}
                        replyTarget={replyTarget}
                        setReplyTarget={setReplyTarget}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        replyPosting={replyPosting}
                        onAddReply={addReply}
                        onDeleteComment={deleteComment}
                        onDeleteReply={deleteReply}
                        deletingId={deletingId}
                      />
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          {/* ========================= RIGHT ========================= */}
          <aside className="ln-right">
            <div className="ln-news-card">
              <div className="ln-side-title"><h4>TroopersTalk News</h4><i className="bi bi-info-square-fill" /></div>
              {[
                ['Build in public','Share project progress and attract collaborators'],
                ['Ask focused questions','Use Question posts for technical doubts'],
                ['Celebrate progress','Share certifications, internships and wins'],
                ['Share opportunities','Post hackathons, jobs and events'],
              ].map(([title, sub]) => (
                <button key={title} onClick={() => setSearch(title)}>
                  <b>{title}</b><span>{sub}</span>
                </button>
              ))}
            </div>

            <div className="ln-news-card">
              <div className="ln-side-title"><h4>Trending topics</h4><i className="bi bi-graph-up-arrow" /></div>
              {trendingTags.length ? trendingTags.map(([tag,count]) => (
                <button key={tag} onClick={() => setSearch(`#${tag}`)}>
                  <b>#{tag}</b><span>{count} posts</span>
                </button>
              )) : <div className="ln-no-trends">Use #hashtags in posts to build trending topics.</div>}
            </div>

            <div className="ln-community-card">
              <strong>Community snapshot</strong>
              <div><span>Active posters</span><b>{communityStats.members}</b></div>
              <div><span>Discussions</span><b>{communityStats.comments}</b></div>
              <p>Keep conversations useful, respectful and focused on learning.</p>
            </div>
          </aside>
        </div>
      </main>

      {/* ========================= CREATE POST MODAL ========================= */}
      {composerOpen && (
        <div className="ln-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setComposerOpen(false); }}>
          <div className="ln-compose-modal">
            <div className="ln-modal-head">
              <h2>Create a post</h2>
              <button onClick={() => setComposerOpen(false)}><i className="bi bi-x-lg" /></button>
            </div>

            <div className="ln-modal-author">
              <Avatar src={user?.photoURL || user?.photo || ''} name={user?.name || user?.displayName || user?.email || 'You'} size={48} />
              <div>
                <strong>{user?.name || user?.displayName || user?.email || 'Member'}</strong>
                <select value={audience} onChange={(e) => setAudience(e.target.value)}>
                  <option>Community</option><option>Connections</option>
                </select>
              </div>
            </div>

            <div className="ln-post-types">
              {[
                ['Update','bi-megaphone'],['Question','bi-patch-question'],['Project','bi-kanban'],['Achievement','bi-trophy'],['Opportunity','bi-briefcase']
              ].map(([label,icon]) => (
                <button key={label} className={postType === label ? 'active' : ''} onClick={() => setPostType(label)}>
                  <i className={`bi ${icon}`} /> {label}
                </button>
              ))}
            </div>

            <textarea
              className="ln-modal-textarea"
              rows={7}
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={postType === 'Question' ? 'Ask a technical question. Use #hashtags so others can find it...' : postType === 'Project' ? 'What are you building? Share progress, stack and collaboration needs...' : 'What do you want to talk about?'}
            />

            {imagePreview && (
              <div className="ln-image-preview">
                <img src={imagePreview} alt="Preview" />
                <button onClick={() => setImageFile(null)}><i className="bi bi-x-lg" /></button>
              </div>
            )}

            {showLinkInput && (
              <div className="ln-link-input"><i className="bi bi-link-45deg" /><input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Paste a useful link..." /></div>
            )}

            {posting && imageFile && <div className="ln-progress"><div style={{width:`${uploadProgress}%`}} /><span>{uploadProgress}%</span></div>}

            <div className="ln-add-row">
              <span>Add to your post</span>
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImagePick} />
                <button title="Photo" onClick={() => fileInputRef.current?.click()}><i className="bi bi-image text-primary" /></button>
                <button title="Link" onClick={() => setShowLinkInput((v) => !v)}><i className="bi bi-link-45deg text-success" /></button>
                <button title="Hashtag" onClick={() => setText((v) => `${v}${v ? ' ' : ''}#`)}><i className="bi bi-hash text-danger" /></button>
              </div>
            </div>

            <div className="ln-modal-footer">
              <span><i className="bi bi-lightbulb" /> Tip: Use #hashtags for better discovery.</span>
              <button className="ln-publish" onClick={publish} disabled={posting || (!text.trim() && !imageFile && !linkUrl.trim())}>
                {posting ? <><span className="spinner-border spinner-border-sm" /> Posting</> : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================= SHARED POST POPUP ========================= */}
      {postModalId && (
        <div className="ln-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closePostModal(); }}>
          <div className="ln-post-modal">
            <div className="ln-modal-head"><h2>Post discussion</h2><button onClick={closePostModal}><i className="bi bi-x-lg" /></button></div>
            {!modalPost ? <div className="ln-empty"><h3>Post not available</h3></div> : (
              <div className="ln-post-modal-scroll">
                <article className="ln-post-card modal-card">
                  <div className="ln-post-header">
                    <div className="ln-post-author"><Avatar src={modalPost.authorPhoto} name={modalPost.author} size={50} /><div><div className="ln-author-name"><strong>{modalPost.author}</strong><span>• 1st</span></div><small>{modalPost.authorEmail || 'TechTroopers member'}</small><small>{relativeDate(modalPost.createdAt)} • <i className="bi bi-globe2" /></small></div></div>
                    <span className={`ln-post-type type-${getPostType(modalPost).toLowerCase()}`}>{getPostType(modalPost)}</span>
                  </div>
                  {!!modalPost.body && <p className="ln-post-body">{modalPost.body}</p>}
                  {!!modalPost.imageUrl && <button className="ln-post-image" onClick={() => setImageViewer(modalPost.imageUrl)}><img src={modalPost.imageUrl} alt="" /></button>}
                  {!!(modalPost.linkUrl || extractFirstLink(modalPost.body || '')) && <a className="ln-link-card" href={modalPost.linkUrl || extractFirstLink(modalPost.body || '')} target="_blank" rel="noreferrer"><div className="ln-link-icon"><i className="bi bi-link-45deg" /></div><div><span>{linkHost(modalPost.linkUrl || extractFirstLink(modalPost.body || ''))}</span><strong>{modalPost.linkUrl || extractFirstLink(modalPost.body || '')}</strong></div></a>}
                  <div className="ln-social-counts"><span>{modalPost.likesCount || 0} likes</span><span>{modalPost.commentsCount || 0} comments</span></div>
                  <div className="ln-post-actions"><button className={user?.uid && modalPost.likedBy?.includes(user.uid) ? 'liked' : ''} onClick={() => toggleLike(modalPost)}><i className="bi bi-hand-thumbs-up" /> Like</button><button><i className="bi bi-chat-text" /> Comment</button><button onClick={() => sharePost(modalPost)}><i className="bi bi-arrow-repeat" /> Share</button></div>
                </article>
                <div className="ln-popup-comments">
                  <CommentsPanel post={modalPost} user={user} isAdmin={isAdmin} comments={comments} loading={commentsLoading} commentText={commentText} setCommentText={setCommentText} commentPosting={commentPosting} onAddComment={addComment} replyTarget={replyTarget} setReplyTarget={setReplyTarget} replyText={replyText} setReplyText={setReplyText} replyPosting={replyPosting} onAddReply={addReply} onDeleteComment={deleteComment} onDeleteReply={deleteReply} deletingId={deletingId} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {imageViewer && (
        <div className="ln-image-viewer" onMouseDown={() => setImageViewer('')}>
          <button onClick={() => setImageViewer('')}><i className="bi bi-x-lg" /></button>
          <img src={imageViewer} alt="Full size" onMouseDown={(e) => e.stopPropagation()} />
        </div>
      )}

      <style>{`
        :root{--ln-blue:#0a66c2;--ln-bg:#f4f2ee;--ln-card:#fff;--ln-text:#1f1f1f;--ln-muted:#666;--ln-border:#dfdfdf}
        .ln-page{min-height:100vh;background:var(--ln-bg);padding:24px 0 70px;font-family:'Poppins',sans-serif;color:var(--ln-text)}
        .ln-shell{display:grid;grid-template-columns:225px minmax(0,620px) 300px;gap:24px;align-items:start;justify-content:center}
        .ln-left,.ln-right{position:sticky;top:20px;display:grid;gap:12px}
        .ln-profile-card,.ln-side-card,.ln-news-card,.ln-community-card,.ln-composer-card,.ln-feed-tools,.ln-post-card,.ln-empty{background:#fff;border:1px solid var(--ln-border);border-radius:10px;overflow:hidden}
        .ln-cover{height:62px;background:linear-gradient(135deg,#0a66c2,#8bb9e5)}
        .ln-profile-main{margin-top:-38px;padding:0 14px 14px;text-align:center}.ln-profile-main .tt-avatar{margin:0 auto 9px;border:3px solid #fff;border-radius:50%!important}.ln-profile-main h3{font-size:14px;margin:0;font-weight:650}.ln-profile-main p{font-size:9.5px;color:#666;line-height:1.5;margin:5px 0 0;overflow-wrap:anywhere}
        .ln-profile-metrics{border-top:1px solid #eee;border-bottom:1px solid #eee;padding:7px 0}.ln-profile-metrics button{width:100%;border:0;background:#fff;display:flex;justify-content:space-between;padding:6px 12px;font:500 10px 'Poppins',sans-serif;color:#666}.ln-profile-metrics button:hover{background:#f3f3f3}.ln-profile-metrics b{color:#0a66c2}
        .ln-bookmark-link{width:100%;border:0;background:#fff;display:flex;gap:8px;align-items:center;padding:11px 12px;color:#555;font:600 10px 'Poppins',sans-serif}.ln-bookmark-link:hover{background:#f3f3f3}
        .ln-side-card{padding:10px 0}.ln-side-card h4{font-size:11px;margin:0 12px 7px}.ln-side-card button{width:100%;border:0;background:#fff;display:grid;grid-template-columns:25px 1fr;gap:6px;align-items:center;padding:8px 12px;text-align:left;color:#666;font:500 10px 'Poppins',sans-serif}.ln-side-card button:hover{background:#f3f3f3;color:#0a66c2}
        .ln-center{min-width:0}.ln-composer-card{padding:12px 16px 7px}.ln-composer-row{display:flex;align-items:center;gap:10px}.ln-composer-row .tt-avatar,.ln-post-author .tt-avatar{border-radius:50%!important}
        .ln-start-post{flex:1;height:48px;border:1px solid #aaa;border-radius:30px;background:#fff;text-align:left;padding:0 16px;color:#666;font:600 12px 'Poppins',sans-serif}.ln-start-post:hover{background:#f3f3f3}
        .ln-composer-actions{display:grid;grid-template-columns:repeat(4,1fr);margin-top:5px}.ln-composer-actions button{border:0;background:#fff;border-radius:6px;height:44px;color:#666;display:flex;justify-content:center;align-items:center;gap:7px;font:600 10px 'Poppins',sans-serif}.ln-composer-actions button:hover{background:#f3f3f3}.ln-composer-actions i{font-size:17px}
        .ln-feed-tools{margin:12px 0;padding:10px}.ln-search{height:38px;border:1px solid #d3d3d3;border-radius:6px;display:flex;align-items:center;gap:8px;padding:0 10px}.ln-search input{border:0;outline:0;flex:1;font:400 10.5px 'Poppins',sans-serif}.ln-search button{border:0;background:transparent;color:#777}.ln-tool-selects{display:flex;gap:8px;margin-top:8px}.ln-tool-selects select{flex:1;min-height:34px;border:1px solid #d3d3d3;border-radius:6px;background:#fff;color:#555;padding:0 8px;font:500 10px 'Poppins',sans-serif}
        .ln-saved-banner{margin-bottom:10px;border:1px solid #bdd7ef;background:#eaf3fc;border-radius:8px;padding:9px 11px;display:flex;justify-content:space-between;color:#004182;font-size:10px}.ln-saved-banner button{border:0;background:transparent;color:#0a66c2;font-weight:600}
        .ln-feed-list{display:grid;gap:10px}.ln-post-card{overflow:visible}.ln-post-header{display:flex;justify-content:space-between;gap:12px;padding:14px 16px 0}.ln-post-author{display:flex;gap:10px;min-width:0}.ln-author-name{display:flex;align-items:center;gap:4px}.ln-author-name strong{font-size:12px;max-width:310px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ln-author-name span,.ln-post-author small{font-size:9px;color:#666}.ln-post-author small{display:block;margin-top:2px;max-width:390px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ln-post-tools{display:flex;align-items:center;gap:4px}.ln-post-tools>button{width:32px;height:32px;border:0;border-radius:50%;background:transparent;color:#666}.ln-post-tools>button:hover{background:#f3f3f3}.ln-post-tools>button.danger:hover{background:#fff0f0;color:#c62828}
        .ln-post-type{border:1px solid #d4d4d4;border-radius:20px;padding:4px 8px;font-size:8.5px;font-weight:600;color:#555}.type-question{background:#fff4df;color:#7a4b00}.type-project{background:#eaf3fc;color:#004182}.type-achievement{background:#fff7cc;color:#7b5a00}.type-opportunity{background:#e8f5ec;color:#057642}
        .ln-post-title{padding:0 16px;margin:12px 0 0;font-size:14px}.ln-post-body{padding:0 16px;margin:10px 0 0;font-size:12.5px;line-height:1.65;color:#292929;white-space:pre-wrap;overflow-wrap:anywhere}.ln-tags{padding:0 16px;margin-top:9px;display:flex;gap:6px;flex-wrap:wrap}.ln-tags button{border:0;background:transparent;padding:0;color:#0a66c2;font:600 10.5px 'Poppins',sans-serif}.ln-solved{display:inline-flex;margin:10px 16px 0;gap:6px;align-items:center;background:#e8f5ec;color:#057642;border-radius:20px;padding:5px 9px;font-size:9px;font-weight:600}
        .ln-post-image{display:block;border:0;padding:0;margin:13px auto 0;max-width:100%;background:#f3f3f3}.ln-post-image img{display:block;width:auto;max-width:100%;max-height:520px;object-fit:contain;margin:auto}
        .ln-link-card{margin-top:13px;border-top:1px solid #e0e0e0;border-bottom:1px solid #e0e0e0;background:#f8f8f8;padding:11px 16px;display:grid;grid-template-columns:38px 1fr 16px;gap:9px;align-items:center;text-decoration:none;color:#1f1f1f}.ln-link-icon{width:38px;height:38px;border-radius:6px;background:#e8edf2;color:#0a66c2;display:grid;place-items:center}.ln-link-card>div:nth-child(2){min-width:0}.ln-link-card span{display:block;font-size:9px;color:#666}.ln-link-card strong{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ln-social-counts{min-height:34px;margin:0 16px;border-bottom:1px solid #ebebeb;display:flex;align-items:center;justify-content:space-between;color:#666;font-size:10px}.ln-social-counts>div{display:flex;align-items:center;gap:5px}.ln-social-counts button{border:0;background:transparent;color:#666;font:400 10px 'Poppins',sans-serif}.ln-like-dot{width:17px;height:17px;border-radius:50%;background:#0a66c2;color:#fff;display:grid;place-items:center;font-size:8px}
        .ln-post-actions{display:grid;grid-template-columns:repeat(4,1fr);padding:4px 8px}.ln-post-actions button{border:0;background:#fff;border-radius:5px;min-height:42px;color:#666;display:flex;justify-content:center;align-items:center;gap:6px;font:600 10px 'Poppins',sans-serif}.ln-post-actions button:hover{background:#f3f3f3}.ln-post-actions button.liked{color:#0a66c2}.ln-post-actions button.solved{color:#057642}
        .ln-empty{padding:45px 20px;text-align:center;color:#777}.ln-empty>i{font-size:30px}.ln-empty h3{font-size:15px;margin:8px 0 4px}.ln-empty p{font-size:10px;margin:0}
        .ln-news-card{padding:12px 0}.ln-side-title{display:flex;justify-content:space-between;align-items:center;padding:0 13px 7px}.ln-side-title h4{font-size:13px;margin:0}.ln-news-card>button{width:100%;border:0;background:#fff;text-align:left;padding:8px 13px}.ln-news-card>button:hover{background:#f3f3f3}.ln-news-card b{display:block;font-size:10px}.ln-news-card span{display:block;margin-top:2px;color:#777;font-size:9px;line-height:1.4}.ln-no-trends{padding:8px 13px;color:#777;font-size:9px}.ln-community-card{padding:13px}.ln-community-card>strong{display:block;font-size:11px;margin-bottom:7px}.ln-community-card>div{display:flex;justify-content:space-between;padding:5px 0;color:#666;font-size:9.5px}.ln-community-card b{color:#0a66c2}.ln-community-card p{font-size:9px;line-height:1.45;color:#777;margin:8px 0 0}
        .ln-modal-backdrop{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.58);display:flex;align-items:center;justify-content:center;padding:20px}.ln-compose-modal,.ln-post-modal{width:min(610px,96vw);max-height:94vh;background:#fff;border-radius:10px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 12px 45px rgba(0,0,0,.28)}.ln-post-modal{width:min(760px,96vw)}.ln-modal-head{min-height:58px;padding:0 16px;border-bottom:1px solid #e0e0e0;display:flex;align-items:center;justify-content:space-between}.ln-modal-head h2{font-size:17px;font-weight:500;margin:0}.ln-modal-head button{width:34px;height:34px;border:0;border-radius:50%;background:transparent}.ln-modal-head button:hover{background:#f2f2f2}
        .ln-modal-author{display:flex;gap:10px;align-items:center;padding:14px 16px 5px}.ln-modal-author .tt-avatar{border-radius:50%!important}.ln-modal-author>div{display:flex;flex-direction:column;align-items:flex-start}.ln-modal-author strong{font-size:12px}.ln-modal-author select{margin-top:3px;min-height:27px;border:1px solid #888;border-radius:15px;background:#fff;padding:0 8px;font:600 9px 'Poppins',sans-serif}
        .ln-post-types{display:flex;gap:6px;padding:9px 16px 0;overflow-x:auto}.ln-post-types button{border:1px solid #ccc;border-radius:18px;background:#fff;white-space:nowrap;padding:6px 9px;color:#555;font:600 9px 'Poppins',sans-serif}.ln-post-types button.active{background:#eaf3fc;color:#0a66c2;border-color:#0a66c2}.ln-modal-textarea{width:100%;border:0;outline:0;resize:none;padding:15px 16px;font:400 13px/1.6 'Poppins',sans-serif}.ln-image-preview{position:relative;margin:0 16px 12px;max-height:300px;background:#f3f3f3;text-align:center;overflow:hidden}.ln-image-preview img{max-width:100%;max-height:300px;object-fit:contain}.ln-image-preview button{position:absolute;right:8px;top:8px;width:32px;height:32px;border:0;border-radius:50%;background:rgba(0,0,0,.7);color:#fff}.ln-link-input{display:flex;gap:8px;align-items:center;margin:0 16px 12px;border:1px solid #ccc;border-radius:6px;padding:0 10px}.ln-link-input input{flex:1;height:38px;border:0;outline:0;font:400 10px 'Poppins',sans-serif}.ln-progress{height:6px;margin:0 16px 12px;background:#e5e5e5;border-radius:8px;position:relative}.ln-progress>div{height:100%;background:#0a66c2;border-radius:inherit}.ln-progress span{position:absolute;right:0;top:-18px;font-size:8px;color:#666}
        .ln-add-row{margin:0 16px;min-height:55px;border:1px solid #e0e0e0;border-radius:7px;display:flex;align-items:center;justify-content:space-between;padding:0 12px}.ln-add-row>span{font-size:10px;font-weight:600}.ln-add-row>div{display:flex;gap:4px}.ln-add-row button{width:34px;height:34px;border:0;border-radius:50%;background:transparent;font-size:17px}.ln-add-row button:hover{background:#f2f2f2}.ln-modal-footer{min-height:58px;border-top:1px solid #e0e0e0;margin-top:13px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;gap:12px}.ln-modal-footer>span{font-size:9px;color:#777}.ln-publish{min-width:72px;height:34px;border:0;border-radius:18px;background:#0a66c2;color:#fff;display:flex;align-items:center;justify-content:center;gap:6px;font:600 10px 'Poppins',sans-serif}.ln-publish:disabled{background:#d0d0d0;color:#777}
        .ln-post-modal-scroll{overflow-y:auto;background:#f4f2ee;padding:12px}.ln-post-card.modal-card{margin:0}.ln-popup-comments{margin-top:10px;background:#fff;border:1px solid #dfdfdf;border-radius:10px}
        .ln-image-viewer{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;padding:30px}.ln-image-viewer>button{position:absolute;right:20px;top:20px;width:42px;height:42px;border:0;border-radius:50%;background:rgba(255,255,255,.15);color:#fff}.ln-image-viewer img{max-width:95vw;max-height:90vh;object-fit:contain}

        /* Existing comment component, restyled for this page */
        .tt-comments-panel{border-top:1px solid #e9e9e9;padding:13px 16px 16px}.tt-comment-composer{display:flex;gap:8px;align-items:flex-start}.tt-comment-composer .tt-avatar,.tt-comment .tt-avatar,.tt-reply-editor .tt-avatar{border-radius:50%!important}.tt-comment-box{flex:1;border:1px solid #bfbfbf;border-radius:18px;padding:8px 10px}.tt-comment-box textarea{border:0;outline:0;resize:none;width:100%;min-height:42px;font:400 10.5px/1.55 'Poppins',sans-serif}.tt-comment-box-footer{display:flex;justify-content:flex-end}.tt-comment-send{border:0;border-radius:17px;background:#0a66c2;color:#fff;padding:6px 11px;font:600 9px 'Poppins',sans-serif}.tt-comments-loading,.tt-comment-empty{padding:13px 0;color:#777;font-size:10px}.tt-comment-list{display:grid;gap:11px;margin-top:12px}.tt-comment{display:flex;gap:8px;align-items:flex-start}.tt-comment-content{flex:1;min-width:0}.tt-comment-bubble{background:#f2f2f2;border-radius:0 12px 12px 12px;padding:8px 10px}.tt-comment-meta-left{display:flex;gap:6px;align-items:center}.tt-comment-meta strong{font-size:10px}.tt-comment-meta small{font-size:8px;color:#777}.tt-comment-bubble p{margin:4px 0 0;font-size:10px;line-height:1.55;white-space:pre-wrap}.tt-comment-tools{display:flex;gap:10px;padding:4px 5px 0}.tt-comment-tools button{border:0;background:transparent;padding:0;color:#666;font:600 8.5px 'Poppins',sans-serif}.tt-comment-tools button:hover{color:#0a66c2}.tt-comment-tools button.delete:hover{color:#c62828}.tt-replies{margin:8px 0 0 15px;display:grid;gap:8px}.tt-reply-to{color:#0a66c2;font-weight:600;margin-right:4px}.tt-reply-editor{display:flex;gap:8px;margin-top:8px}.tt-reply-editor-box{flex:1;border:1px solid #ccc;border-radius:14px;padding:7px 9px}.tt-reply-editor textarea{width:100%;border:0;outline:0;resize:none;min-height:38px;font:400 10px 'Poppins',sans-serif}.tt-reply-editor-footer{display:flex;justify-content:flex-end;gap:6px}.tt-mini-btn{border:0;border-radius:15px;padding:5px 9px;background:#e8e8e8;color:#555;font:600 8.5px 'Poppins',sans-serif}.tt-mini-btn.primary{background:#0a66c2;color:#fff}.tt-avatar{display:grid;place-items:center;overflow:hidden;flex:0 0 auto;background:linear-gradient(135deg,#0a66c2,#6da6db);color:#fff;font-weight:700;line-height:1;user-select:none}.tt-avatar span{display:grid;place-items:center;width:100%;height:100%;font-size:42%;font-weight:700;color:#fff}.tt-avatar img{display:block;width:100%;height:100%;object-fit:cover;border-radius:50%}

        @media(max-width:1100px){.ln-shell{grid-template-columns:210px minmax(0,620px)}.ln-right{display:none}}
        @media(max-width:800px){.ln-shell{grid-template-columns:1fr}.ln-left{display:none}.ln-center{max-width:620px;width:100%;margin:auto}}
        @media(max-width:620px){.ln-page{padding:0 0 60px}.ln-shell{display:block;padding-left:0!important;padding-right:0!important}.ln-center{max-width:none}.ln-composer-card,.ln-feed-tools,.ln-post-card,.ln-empty{border-left:0;border-right:0;border-radius:0}.ln-feed-tools{margin:8px 0}.ln-composer-actions button{font-size:0}.ln-composer-actions button i{font-size:18px}.ln-post-actions button{font-size:0}.ln-post-actions button i{font-size:18px}.ln-modal-backdrop{padding:0;align-items:stretch}.ln-compose-modal,.ln-post-modal{width:100%;height:100vh;max-height:none;border-radius:0}.ln-post-modal-scroll{padding:0}.ln-popup-comments{border-left:0;border-right:0;border-radius:0}.ln-tool-selects{display:grid;grid-template-columns:1fr 1fr}}
      `}</style>
    </>
  );
}

function Avatar({ src, name, size = 40 }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const displayName = String(name || 'Member').trim();
  const firstLetter = displayName.charAt(0).toUpperCase() || 'M';
  const showImage = Boolean(src) && !imageFailed;

  return (
    <div
      className="tt-avatar"
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
      }}
      title={displayName}
      aria-label={displayName}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{firstLetter}</span>
      )}
    </div>
  );
}

function CommentsPanel({
  user,
  isAdmin,
  comments,
  loading,
  commentText,
  setCommentText,
  commentPosting,
  onAddComment,
  replyTarget,
  setReplyTarget,
  replyText,
  setReplyText,
  replyPosting,
  onAddReply,
  onDeleteComment,
  onDeleteReply,
  deletingId,
}) {
  const openReply = (commentId, replyToName = '') => {
    setReplyTarget({ commentId, replyToName });
    setReplyText('');
  };

  return (
    <div className="tt-comments-panel">
      <div className="tt-comment-composer">
        <Avatar
          src={user?.photoURL || user?.photo || ''}
          name={user?.name || user?.displayName || user?.email || 'You'}
          size={36}
        />
        <div className="tt-comment-box">
          <textarea
            rows={2}
            placeholder={user ? 'Write a comment...' : 'Login to join this discussion...'}
            value={commentText}
            disabled={!user || commentPosting}
            onChange={(event) => setCommentText(event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') onAddComment();
            }}
          />
          <div className="tt-comment-box-footer">
            <button
              type="button"
              className="tt-comment-send"
              disabled={!user || commentPosting || !commentText.trim()}
              onClick={onAddComment}
            >
              {commentPosting ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <i className="bi bi-send-fill" />
              )}
              Comment
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="tt-comments-loading">
          <span className="spinner-border spinner-border-sm text-primary" />
          Loading discussion...
        </div>
      )}

      {!loading && !comments.length && (
        <div className="tt-comment-empty">No comments yet. Start the discussion.</div>
      )}

      {!loading && comments.length > 0 && (
        <div className="tt-comment-list">
          {comments.map((comment) => {
            const canDeleteComment = Boolean(
              user && (isAdmin || comment.authorUid === user.uid)
            );

            return (
              <div className="tt-comment" key={comment.id}>
                <Avatar src={comment.authorPhoto} name={comment.authorName} size={34} />

                <div className="tt-comment-content">
                  <div className="tt-comment-bubble">
                    <div className="tt-comment-meta">
                      <div className="tt-comment-meta-left">
                        <strong>{comment.authorName || 'Member'}</strong>
                        <small>{relativeDate(comment.createdAt)}</small>
                      </div>
                    </div>
                    <p>{comment.content}</p>
                  </div>

                  <div className="tt-comment-tools">
                    <button
                      type="button"
                      onClick={() => openReply(comment.id, comment.authorName)}
                      disabled={!user}
                    >
                      Reply
                    </button>
                    {canDeleteComment && (
                      <button
                        type="button"
                        className="delete"
                        onClick={() => onDeleteComment(comment)}
                        disabled={deletingId === `comment-${comment.id}`}
                      >
                        {deletingId === `comment-${comment.id}` ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>

                  {!!comment.replies?.length && (
                    <div className="tt-replies">
                      {comment.replies.map((reply) => {
                        const canDeleteReply = Boolean(
                          user && (isAdmin || reply.authorUid === user.uid)
                        );

                        return (
                          <div className="tt-comment" key={reply.id}>
                            <Avatar
                              src={reply.authorPhoto}
                              name={reply.authorName || reply.name || 'Member'}
                              size={30}
                            />

                            <div className="tt-comment-content">
                              <div className="tt-comment-bubble">
                                <div className="tt-comment-meta">
                                  <div className="tt-comment-meta-left">
                                    <strong>
                                      {reply.authorName || reply.name || reply.authorEmail || 'Member'}
                                    </strong>
                                    <small>{relativeDate(reply.createdAt)}</small>
                                  </div>
                                </div>
                                <p>
                                  {reply.replyToName && (
                                    <span className="tt-reply-to">@{reply.replyToName}</span>
                                  )}
                                  {reply.content || reply.text || reply.comment || ''}
                                </p>
                              </div>

                              <div className="tt-comment-tools">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openReply(
                                      comment.id,
                                      reply.authorName || reply.name || 'Member'
                                    )
                                  }
                                  disabled={!user}
                                >
                                  Reply
                                </button>
                                {canDeleteReply && (
                                  <button
                                    type="button"
                                    className="delete"
                                    onClick={() => onDeleteReply(comment.id, reply)}
                                    disabled={deletingId === `reply-${reply.id}`}
                                  >
                                    {deletingId === `reply-${reply.id}` ? 'Deleting...' : 'Delete'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {replyTarget?.commentId === comment.id && (
                    <div className="tt-reply-editor">
                      <Avatar
                        src={user?.photoURL || user?.photo || ''}
                        name={user?.name || user?.email || 'You'}
                        size={30}
                      />
                      <div className="tt-reply-editor-box">
                        <textarea
                          rows={2}
                          autoFocus
                          placeholder={`Reply to ${replyTarget.replyToName || comment.authorName}...`}
                          value={replyText}
                          onChange={(event) => setReplyText(event.target.value)}
                          onKeyDown={(event) => {
                            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                              onAddReply(comment.id);
                            }
                          }}
                        />
                        <div className="tt-reply-editor-footer">
                          <button
                            type="button"
                            className="tt-mini-btn"
                            onClick={() => {
                              setReplyTarget(null);
                              setReplyText('');
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="tt-mini-btn primary"
                            disabled={replyPosting || !replyText.trim()}
                            onClick={() => onAddReply(comment.id)}
                          >
                            {replyPosting ? 'Posting...' : 'Reply'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}