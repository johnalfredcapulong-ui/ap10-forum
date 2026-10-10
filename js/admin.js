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

// ---------- Tabs ----------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// ============================================================
// MODULE FORM
// ============================================================
const moduleForm = document.getElementById('module-form');
const moduleCoverZone = document.getElementById('module-cover-zone');
const moduleCoverInput = document.getElementById('module-cover-input');
const moduleCoverPreview = document.getElementById('module-cover-preview');
const moduleCoverUrl = document.getElementById('module-cover-url');
const moduleCoverInner = document.getElementById('module-cover-inner');
const moduleCoverStatus = document.getElementById('module-cover-status');
const moduleMsg = document.getElementById('module-msg');

moduleCoverZone.addEventListener('click', () => moduleCoverInput.click());

moduleCoverInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleModuleCoverUpload(file);
});

async function handleModuleCoverUpload(file) {
  if (!file.type.startsWith('image/')) {
    moduleCoverStatus.textContent = 'Not a valid image file.';
    moduleCoverStatus.className = 'upload-status error';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    moduleCoverStatus.textContent = 'File exceeds 5 MB.';
    moduleCoverStatus.className = 'upload-status error';
    return;
  }

  moduleCoverStatus.textContent = 'Uploading...';
  moduleCoverStatus.className = 'upload-status uploading';

  const ext = file.name.split('.').pop();
  const filename = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from('materials')
    .upload(filename, file, { cacheControl: '3600', upsert: false });

  if (error) {
    moduleCoverStatus.textContent = `Upload error: ${error.message}`;
    moduleCoverStatus.className = 'upload-status error';
    return;
  }

  const { data: publicData } = supabase.storage
    .from('materials')
    .getPublicUrl(data.path);

  moduleCoverUrl.value = publicData.publicUrl;
  moduleCoverPreview.src = publicData.publicUrl;
  moduleCoverPreview.style.display = 'block';
  moduleCoverZone.classList.add('has-image');
  moduleCoverInner.style.display = 'none';

  moduleCoverStatus.textContent = 'Uploaded.';
  moduleCoverStatus.className = 'upload-status success';
}

moduleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  moduleMsg.textContent = 'Saving...';
  moduleMsg.className = 'form-msg';

  const form = new FormData(moduleForm);
  const payload = {
    title: form.get('title').trim(),
    slug: form.get('slug').trim().toLowerCase(),
    description: form.get('description').trim(),
    category: form.get('category').trim() || 'General',
    cover_url: moduleCoverUrl.value || null,
    order_index: parseInt(form.get('order_index')) || 0,
  };

  const { error } = await supabase.from('topics').insert(payload);

  if (error) {
    moduleMsg.textContent = `Error: ${error.message}`;
    moduleMsg.className = 'form-msg error';
    return;
  }

  moduleMsg.textContent = 'Module added.';
  moduleMsg.className = 'form-msg success';
  moduleForm.reset();
  moduleCoverUrl.value = '';
  moduleCoverPreview.src = '';
  moduleCoverPreview.style.display = 'none';
  moduleCoverZone.classList.remove('has-image');
  moduleCoverInner.style.display = 'flex';
  loadTopicSelects();
});

// ============================================================
// MATERIAL FORM
// ============================================================
const materialForm = document.getElementById('material-form');
const materialTopicSelect = document.getElementById('material-topic-select');
const materialKind = document.getElementById('material-kind');
const materialUrlField = document.getElementById('material-url-field');
const materialContentField = document.getElementById('material-content-field');
const materialUploadZone = document.getElementById('material-upload-zone');
const materialImageInput = document.getElementById('material-image-input');
const materialUploadPreview = document.getElementById('material-upload-preview');
const materialUrlHidden = document.getElementById('material-url-hidden');
const materialUploadInner = document.getElementById('material-upload-inner');
const materialUploadStatus = document.getElementById('material-upload-status');
const materialMsg = document.getElementById('material-msg');

materialForm.addEventListener('change', (e) => {
  if (e.target.name === 'type') {
    if (e.target.value === 'image') {
      materialUrlField.style.display = 'flex';
      materialContentField.style.display = 'none';
    } else {
      materialUrlField.style.display = 'none';
      materialContentField.style.display = 'flex';
    }
  }
});

materialUploadZone.addEventListener('click', () => materialImageInput.click());

materialImageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleMaterialImageUpload(file);
});

async function handleMaterialImageUpload(file) {
  if (!file.type.startsWith('image/')) {
    materialUploadStatus.textContent = 'Not a valid image file.';
    materialUploadStatus.className = 'upload-status error';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    materialUploadStatus.textContent = 'File exceeds 5 MB.';
    materialUploadStatus.className = 'upload-status error';
    return;
  }

  materialUploadStatus.textContent = 'Uploading...';
  materialUploadStatus.className = 'upload-status uploading';

  const ext = file.name.split('.').pop();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from('materials')
    .upload(filename, file, { cacheControl: '3600', upsert: false });

  if (error) {
    materialUploadStatus.textContent = `Upload error: ${error.message}`;
    materialUploadStatus.className = 'upload-status error';
    return;
  }

  const { data: publicData } = supabase.storage
    .from('materials')
    .getPublicUrl(data.path);

  materialUrlHidden.value = publicData.publicUrl;
  materialUploadPreview.src = publicData.publicUrl;
  materialUploadPreview.style.display = 'block';
  materialUploadZone.classList.add('has-image');
  materialUploadInner.style.display = 'none';

  materialUploadStatus.textContent = 'Uploaded.';
  materialUploadStatus.className = 'upload-status success';
}

materialForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  materialMsg.textContent = 'Saving...';
  materialMsg.className = 'form-msg';

  const form = new FormData(materialForm);
  const type = form.get('type');

  const payload = {
    topic_id: form.get('topic_id'),
    kind: form.get('kind') || 'reading',
    section: form.get('section') || 'info',
    type,
    url: type === 'image' ? materialUrlHidden.value : null,
    content: type === 'text' ? form.get('content').trim() : null,
    title: form.get('title').trim() || null,
    caption: form.get('caption').trim(),
    order_index: parseInt(form.get('order_index')) || 0,
  };

  if (!payload.topic_id) {
    materialMsg.textContent = 'Please select a module.';
    materialMsg.className = 'form-msg error';
    return;
  }

  if (type === 'image' && !payload.url) {
    materialMsg.textContent = 'Please upload an image.';
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
  materialUrlHidden.value = '';
  materialUploadPreview.src = '';
  materialUploadPreview.style.display = 'none';
  materialUploadZone.classList.remove('has-image');
  materialUploadInner.style.display = 'flex';
  materialUrlField.style.display = 'flex';
  materialContentField.style.display = 'none';
});

// ============================================================
// QUIZ FORM
// ============================================================
const quizForm = document.getElementById('quiz-form');
const quizTopicSelect = document.getElementById('quiz-topic-select');
const quizQuestionsEl = document.getElementById('quiz-questions');
const quizMsg = document.getElementById('quiz-msg');
const addQuestionBtn = document.getElementById('add-question-btn');

let questionCounter = 0;

function addQuestionBlock() {
  const id = ++questionCounter;
  const div = document.createElement('div');
  div.className = 'quiz-question-block';
  div.dataset.qid = id;
  div.style.cssText = 'background:#f9fafb; padding:1rem; border-radius:10px; border:1px solid #e5e7eb; margin-bottom:0.75rem;';

  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
      <strong style="font-size:0.85rem; color:#14532d;">Question ${id}</strong>
      <button type="button" class="btn-delete remove-question">Remove</button>
    </div>
    <div class="field">
      <label>Prompt</label>
      <textarea class="q-prompt" rows="2" placeholder="Question text..." required></textarea>
    </div>
    <div class="field">
      <label>Choices (one per line)</label>
      <textarea class="q-choices" rows="4" placeholder="Choice 1&#10;Choice 2&#10;Choice 3&#10;Choice 4" required></textarea>
    </div>
    <div class="field">
      <label>Correct Answer</label>
      <input type="text" class="q-correct" placeholder="Must match one choice exactly" required />
    </div>
    <div class="field">
      <label>Rationalization (answer key explanation)</label>
      <textarea class="q-rationalization" rows="3" placeholder="Ipaliwanag nang maikli kung bakit ito ang tamang sagot"></textarea>
    </div>
  `;

  div.querySelector('.remove-question').addEventListener('click', () => div.remove());
  quizQuestionsEl.appendChild(div);
}

addQuestionBtn.addEventListener('click', addQuestionBlock);

// Add one block by default
addQuestionBlock();

quizForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  quizMsg.textContent = 'Saving quiz...';
  quizMsg.className = 'form-msg';

  const form = new FormData(quizForm);
  const topicId = form.get('topic_id');
  const title = form.get('title').trim();
  const passPercent = parseInt(form.get('pass_percent')) || 70;

  if (!topicId || !title) {
    quizMsg.textContent = 'Module and title are required.';
    quizMsg.className = 'form-msg error';
    return;
  }

  // Collect questions
  const questionBlocks = quizQuestionsEl.querySelectorAll('.quiz-question-block');
  const questions = [];

  for (const block of questionBlocks) {
    const prompt = block.querySelector('.q-prompt').value.trim();
    const choicesRaw = block.querySelector('.q-choices').value.trim();
    const correct = block.querySelector('.q-correct').value.trim();
    const rationalization = block.querySelector('.q-rationalization').value.trim();

    if (!prompt || !choicesRaw || !correct) {
      quizMsg.textContent = 'All questions need prompt, choices, and correct answer.';
      quizMsg.className = 'form-msg error';
      return;
    }

    const choices = choicesRaw.split('\n').map((c) => c.trim()).filter(Boolean);

    if (choices.length < 2) {
      quizMsg.textContent = 'Each question needs at least 2 choices.';
      quizMsg.className = 'form-msg error';
      return;
    }

    if (!choices.includes(correct)) {
      quizMsg.textContent = `Correct answer "${correct}" must exactly match one of the choices.`;
      quizMsg.className = 'form-msg error';
      return;
    }

    questions.push({ prompt, choices, correct, rationalization });
  }

  if (!questions.length) {
    quizMsg.textContent = 'At least one question is required.';
    quizMsg.className = 'form-msg error';
    return;
  }

  // Create the quiz material
  const { data: material, error: matErr } = await supabase
    .from('materials')
    .insert({
      topic_id: topicId,
      kind: 'assessment',
      type: 'text',
      title,
      pass_percent: passPercent,
      content: null,
      caption: null,
      section: 'info',
      order_index: 0,
    })
    .select()
    .single();

  if (matErr || !material) {
    quizMsg.textContent = `Error creating quiz: ${matErr?.message || 'unknown'}`;
    quizMsg.className = 'form-msg error';
    return;
  }

  // Insert questions
  const questionRows = questions.map((q, i) => ({
    material_id: material.id,
    prompt: q.prompt,
    kind: 'multiple_choice',
    choices: q.choices,
    correct_answer: q.correct,
    rationalization: q.rationalization || null,
    order_index: i + 1,
  }));

  const { error: qErr } = await supabase.from('questions').insert(questionRows);

  if (qErr) {
    quizMsg.textContent = `Quiz created but questions failed: ${qErr.message}`;
    quizMsg.className = 'form-msg error';
    return;
  }

  quizMsg.textContent = `Quiz created with ${questions.length} question(s).`;
  quizMsg.className = 'form-msg success';
  quizForm.reset();
  quizQuestionsEl.innerHTML = '';
  questionCounter = 0;
  addQuestionBlock();
});

// ============================================================
// GLOSSARY FORM
// ============================================================
const glossaryForm = document.getElementById('glossary-form');
const glossaryMsg = document.getElementById('glossary-msg');

glossaryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  glossaryMsg.textContent = 'Saving...';
  glossaryMsg.className = 'form-msg';

  const form = new FormData(glossaryForm);
  const term = form.get('term').trim();
  const payload = {
    term,
    slug: term.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    definition: form.get('definition').trim(),
    local_example: form.get('local_example').trim() || null,
  };

  const { error } = await supabase.from('glossary').insert(payload);

  if (error) {
    glossaryMsg.textContent = `Error: ${error.message}`;
    glossaryMsg.className = 'form-msg error';
    return;
  }

  glossaryMsg.textContent = 'Term added.';
  glossaryMsg.className = 'form-msg success';
  glossaryForm.reset();
});

// ============================================================
// LOAD TOPIC SELECTS
// ============================================================
async function loadTopicSelects() {
  const { data } = await supabase
    .from('topics')
    .select('id, title')
    .order('order_index', { ascending: true })
    .order('title', { ascending: true });

  const options = '<option value="">— Select a module —</option>' +
    (data || []).map((t) => `<option value="${t.id}">${t.title}</option>`).join('');

  if (materialTopicSelect) materialTopicSelect.innerHTML = options;
  if (quizTopicSelect) quizTopicSelect.innerHTML = options;
}

loadTopicSelects();