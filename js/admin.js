import { supabase } from './supabase.js';
import { initLayout } from './layout.js';

// ---------- Verify user + role ----------
const user = await initLayout('admin.html');
if (!user) throw new Error('Not logged in');

const role = user.user_metadata.role || 'student';
if (role !== 'teacher' && role !== 'admin') {
  document.querySelector('.dashboard-content').innerHTML = `
    <h1 class="page-title">Access Denied</h1>
    <p class="page-sub">This area is for teachers only.</p>
  `;
  throw new Error('Not authorized');
}

// ---------- DOM refs ----------
const topicForm = document.getElementById('topic-form');
const materialForm = document.getElementById('material-form');
const topicSelect = document.getElementById('topic-select');
const topicMsg = document.getElementById('topic-msg');
const materialMsg = document.getElementById('material-msg');
const recentEl = document.getElementById('recent-materials');

const uploadZone = document.getElementById('upload-zone');
const imageInput = document.getElementById('image-input');
const uploadPreview = document.getElementById('upload-preview');
const urlHidden = document.getElementById('url-hidden');
const uploadStatus = document.getElementById('upload-status');

const fieldUrl = document.getElementById('field-url');
const fieldContent = document.getElementById('field-content');

// ---------- Initial load ----------
loadTopicOptions();
loadRecentMaterials();

// ---------- Tabs ----------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// ---------- Type toggle ----------
materialForm.addEventListener('change', (e) => {
  if (e.target.name === 'type') {
    if (e.target.value === 'image') {
      fieldUrl.style.display = 'flex';
      fieldContent.style.display = 'none';
    } else {
      fieldUrl.style.display = 'none';
      fieldContent.style.display = 'flex';
    }
  }
});

// ---------- Load topics ----------
async function loadTopicOptions() {
  const { data, error } = await supabase
    .from('topics')
    .select('id, title')
    .order('title');

  if (error) {
    topicSelect.innerHTML = `<option>Error: ${error.message}</option>`;
    return;
  }

  topicSelect.innerHTML = '<option value="">— Select a topic —</option>' +
    data.map((t) => `<option value="${t.id}">${t.title}</option>`).join('');
}

// ---------- Add Topic ----------
topicForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  topicMsg.textContent = 'Saving...';
  topicMsg.className = 'form-msg';

  const form = new FormData(topicForm);
  const payload = {
    title: form.get('title').trim(),
    slug: form.get('slug').trim().toLowerCase(),
    description: form.get('description').trim(),
  };

  const { error } = await supabase.from('topics').insert(payload);

  if (error) {
    topicMsg.textContent = `Error: ${error.message}`;
    topicMsg.className = 'form-msg error';
    return;
  }

  topicMsg.textContent = 'Topic added.';
  topicMsg.className = 'form-msg success';
  topicForm.reset();
  loadTopicOptions();
});

// ---------- Image upload ----------
uploadZone.addEventListener('click', () => imageInput.click());

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragging');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragging');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragging');
  const file = e.dataTransfer.files[0];
  if (file) handleImageUpload(file);
});

imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleImageUpload(file);
});

async function handleImageUpload(file) {
  if (!file.type.startsWith('image/')) {
    setUploadStatus('Not a valid image file.', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    setUploadStatus('File exceeds 5 MB.', 'error');
    return;
  }

  setUploadStatus('Uploading...', 'uploading');

  const ext = file.name.split('.').pop();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from('materials')
    .upload(filename, file, { cacheControl: '3600', upsert: false });

  if (error) {
    setUploadStatus(`Upload error: ${error.message}`, 'error');
    return;
  }

  const { data: publicData } = supabase.storage
    .from('materials')
    .getPublicUrl(data.path);

  urlHidden.value = publicData.publicUrl;

  uploadPreview.src = publicData.publicUrl;
  uploadPreview.style.display = 'block';
  uploadZone.classList.add('has-image');
  uploadZone.querySelector('.upload-inner').style.display = 'none';

  setUploadStatus('Uploaded. You can save now.', 'success');
}

function setUploadStatus(msg, type = '') {
  uploadStatus.textContent = msg;
  uploadStatus.className = 'upload-status ' + type;
}

function resetUpload() {
  urlHidden.value = '';
  uploadPreview.src = '';
  uploadPreview.style.display = 'none';
  uploadZone.classList.remove('has-image');
  uploadZone.querySelector('.upload-inner').style.display = 'flex';
  imageInput.value = '';
  setUploadStatus('');
}

// ---------- Add Material ----------
materialForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  materialMsg.textContent = 'Saving...';
  materialMsg.className = 'form-msg';

  const form = new FormData(materialForm);
  const type = form.get('type');

  const payload = {
    topic_id: form.get('topic_id'),
    type,
    url: type === 'image' ? urlHidden.value : null,
    content: type === 'text' ? form.get('content').trim() : null,
    caption: form.get('caption').trim(),
  };

  if (!payload.topic_id) {
    materialMsg.textContent = 'Please select a topic first.';
    materialMsg.className = 'form-msg error';
    return;
  }

  if (type === 'image' && !payload.url) {
    materialMsg.textContent = 'Please upload an image first.';
    materialMsg.className = 'form-msg error';
    return;
  }

  if (type === 'text' && !payload.content) {
    materialMsg.textContent = 'Content is required for text material.';
    materialMsg.className = 'form-msg error';
    return;
  }

  const { error } = await supabase.from('materials').insert(payload);

  if (error) {
    materialMsg.textContent = `Error: ${error.message}`;
    materialMsg.className = 'form-msg error';
    return;
  }

  materialMsg.textContent = 'Material added.';
  materialMsg.className = 'form-msg success';
  materialForm.reset();
  resetUpload();
  loadRecentMaterials();
});

// ---------- Recent materials ----------
async function loadRecentMaterials() {
  const { data, error } = await supabase
    .from('materials')
    .select('*, topics(title)')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    recentEl.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    return;
  }

  if (!data.length) {
    recentEl.innerHTML = '<p class="empty">No materials yet.</p>';
    return;
  }

  recentEl.innerHTML = data.map((m) => `
    <div class="admin-item">
      <span class="badge">${m.type}</span>
      <strong>${m.topics?.title || '—'}</strong>
      <span class="item-text">${m.caption || m.content?.slice(0, 60) || ''}</span>
      <button class="btn-delete" data-id="${m.id}">Delete</button>
    </div>
  `).join('');

  recentEl.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this?')) return;

      const { data: mat } = await supabase
        .from('materials')
        .select('url')
        .eq('id', btn.dataset.id)
        .maybeSingle();

      await supabase.from('materials').delete().eq('id', btn.dataset.id);

      if (mat?.url && mat.url.includes('/storage/v1/object/public/materials/')) {
        const path = mat.url.split('/materials/')[1];
        await supabase.storage.from('materials').remove([path]);
      }

      loadRecentMaterials();
    });
  });
}