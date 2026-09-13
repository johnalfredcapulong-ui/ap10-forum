import { supabase } from './supabase.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

const titleEl = document.getElementById('topic-title');
const descEl = document.getElementById('topic-description');
const materialsEl = document.getElementById('materials');
const videosEl = document.getElementById('videos');
const postsEl = document.getElementById('posts');

let topic = null;

// ---------- Load topic ----------
async function loadTopic() {
  if (!slug) {
    titleEl.textContent = 'No topic found';
    return;
  }

  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    titleEl.textContent = 'No topic found';
    descEl.textContent = error?.message || '';
    return;
  }

  topic = data;
  document.title = `${topic.title} — AP10`;
  titleEl.textContent = topic.title;
  descEl.textContent = topic.description || '';

  loadMaterials();
  loadPosts();
  loadVideos();
}

// ---------- Materials ----------
async function loadMaterials() {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('topic_id', topic.id)
    .order('created_at', { ascending: true });

  if (error) {
    materialsEl.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    return;
  }

  if (!data.length) {
    materialsEl.innerHTML = '<p class="empty">No materials for this topic yet.</p>';
    return;
  }

  materialsEl.innerHTML = data.map((m) => {
    if (m.type === 'image') {
      return `
        <figure class="material-card">
          <img src="${m.url}" alt="${m.caption || ''}" loading="lazy" />
          <figcaption>${m.caption || ''}</figcaption>
        </figure>
      `;
    }
    return `
      <div class="material-card material-text">
        ${m.caption ? `<h3>${m.caption}</h3>` : ''}
        <p>${m.content || ''}</p>
      </div>
    `;
  }).join('');
}

// ---------- Videos ----------
async function loadVideos() {
  if (!topic) return;

  const query = topic.title;
  const normalized = query.toLowerCase().trim();

  const { data: cached } = await supabase
    .from('yt_cache')
    .select('results')
    .eq('query', normalized)
    .maybeSingle();

  if (cached) {
    renderVideos(cached.results);
    return;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/youtube-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      videosEl.innerHTML = '<p class="error">Could not load videos.</p>';
      return;
    }

    const data = await res.json();
    const videos = (data.items || []).map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      channel: item.snippet.channelTitle,
    }));

    await supabase.from('yt_cache').insert({ query: normalized, results: videos });

    renderVideos(videos);
  } catch (err) {
    console.error('YouTube fetch failed:', err);
    videosEl.innerHTML = '<p class="error">Could not load videos.</p>';
  }
}

function renderVideos(videos) {
  if (!videos.length) {
    videosEl.innerHTML = '<p class="empty">No videos found.</p>';
    return;
  }

  videosEl.innerHTML = videos.map((v) => `
    <div class="video-card" data-video-id="${v.videoId}" data-title="${v.title.replace(/"/g, '&quot;')}">
      <div class="video-thumb">
        <img src="${v.thumbnail}" alt="${v.title}" loading="lazy" />
        <div class="play-button">▶</div>
      </div>
      <h3>${v.title}</h3>
      <p>${v.channel}</p>
    </div>
  `).join('');

  document.querySelectorAll('.video-card').forEach((card) => {
    card.addEventListener('click', () => {
      openVideoModal(card.dataset.videoId, card.dataset.title);
    });
  });
}

function openVideoModal(videoId, title) {
  const modal = document.createElement('div');
  modal.className = 'video-modal';
  modal.innerHTML = `
    <div class="video-modal-backdrop"></div>
    <div class="video-modal-content">
      <button class="video-modal-close" aria-label="Close">&times;</button>
      <div class="video-modal-player">
        <iframe
          src="https://www.youtube.com/embed/${videoId}?autoplay=1"
          title="${title}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  const close = () => {
    modal.remove();
    document.body.style.overflow = '';
  };
  modal.querySelector('.video-modal-close').addEventListener('click', close);
  modal.querySelector('.video-modal-backdrop').addEventListener('click', close);
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', esc);
    }
  });
}

// ---------- Posts (forum) ----------
async function loadPosts() {
  if (!topic) return;

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('topic_id', topic.id)
    .order('created_at', { ascending: true });

  if (error) {
    postsEl.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    return;
  }

  if (!data.length) {
    postsEl.innerHTML = '<p class="empty">No posts yet. Be the first!</p>';
    return;
  }

  const topLevel = data.filter((p) => !p.parent_id);
  const replies = data.filter((p) => p.parent_id);

  postsEl.innerHTML = topLevel.map((p) => {
    const childReplies = replies
      .filter((r) => r.parent_id === p.id)
      .map((r) => `
        <div class="reply">
          <div class="reply-header">
            <strong>${escapeHtml(r.name || 'Anonymous')}</strong>
            <span class="badge">${r.type === 'reflection' ? 'Reflection' : 'Reply'}</span>
          </div>
          <p>${escapeHtml(r.content)}</p>
        </div>
      `).join('');

    return `
      <div class="post" data-post-id="${p.id}">
        <div class="post-header">
          <strong>${escapeHtml(p.name || 'Anonymous')}</strong>
          <span class="badge">${p.type === 'reflection' ? 'Reflection' : 'Question'}</span>
        </div>
        <p>${escapeHtml(p.content)}</p>

        ${childReplies ? `<div class="replies">${childReplies}</div>` : ''}

        <button class="reply-toggle" data-parent="${p.id}">Reply</button>

        <div class="reply-form-wrap" data-form-for="${p.id}" style="display:none;">
          <input type="text" class="reply-name" placeholder="Your name" maxlength="50" />
          <textarea class="reply-content" placeholder="Write your reply..." maxlength="1000"></textarea>
          <div class="reply-actions">
            <button class="btn-secondary reply-cancel">Cancel</button>
            <button class="btn reply-submit" data-parent="${p.id}">Send</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  attachPostHandlers();
}

function attachPostHandlers() {
  postsEl.querySelectorAll('.reply-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrap = postsEl.querySelector(`[data-form-for="${btn.dataset.parent}"]`);
      wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
    });
  });

  postsEl.querySelectorAll('.reply-cancel').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.reply-form-wrap');
      wrap.style.display = 'none';
      wrap.querySelector('.reply-name').value = '';
      wrap.querySelector('.reply-content').value = '';
    });
  });

  postsEl.querySelectorAll('.reply-submit').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!topic) return;

      const wrap = postsEl.querySelector(`[data-form-for="${btn.dataset.parent}"]`);
      const name = wrap.querySelector('.reply-name').value.trim();
      const content = wrap.querySelector('.reply-content').value.trim();

      if (!name || !content) {
        alert('Name and reply are required.');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Sending...';

      const { error } = await supabase.from('posts').insert({
        topic_id: topic.id,
        parent_id: btn.dataset.parent,
        name,
        content,
        type: 'discussion',
      });

      if (error) {
        alert('Error: ' + error.message);
        btn.disabled = false;
        btn.textContent = 'Send';
        return;
      }

      loadPosts();
    });
  });
}

// ---------- Escape helper ----------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------- New post form ----------
const postForm = document.getElementById('post-form');
const postMsg = document.getElementById('post-msg');

if (postForm) {
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!topic) {
      postMsg.textContent = 'Topic is still loading. Try again.';
      postMsg.className = 'form-msg error';
      return;
    }

    postMsg.textContent = 'Posting...';
    postMsg.className = 'form-msg';

    const name = document.getElementById('post-name').value.trim();
    const content = document.getElementById('post-content').value.trim();
    const type = document.getElementById('post-type').value;

    if (!name || !content) {
      postMsg.textContent = 'Name and content are required.';
      postMsg.className = 'form-msg error';
      return;
    }

    const { error } = await supabase.from('posts').insert({
      topic_id: topic.id,
      name,
      content,
      type,
      parent_id: null,
    });

    if (error) {
      postMsg.textContent = `Error: ${error.message}`;
      postMsg.className = 'form-msg error';
      return;
    }

    postMsg.textContent = 'Posted.';
    postMsg.className = 'form-msg success';
    postForm.reset();
    loadPosts();
  });
}

// ---------- Start ----------
loadTopic();