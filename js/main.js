import { supabase } from './supabase.js';

const topicsEl = document.getElementById('topics');
const searchEl = document.getElementById('search');

let allTopics = [];

async function loadTopics() {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    topicsEl.innerHTML = `<p class="error">Error: ${error.message}</p>`;
    return;
  }

  allTopics = data;
  renderTopics(allTopics);
}

function renderTopics(topics) {
  if (!topics.length) {
    topicsEl.innerHTML = '<p class="empty">No topics found.</p>';
    return;
  }

  topicsEl.innerHTML = topics.map((t) => `
    <a class="topic-card" href="topic.html?slug=${t.slug}">
      <h2>${t.title}</h2>
      <p>${t.description || ''}</p>
    </a>
  `).join('');
}

searchEl.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  const filtered = allTopics.filter((t) =>
    t.title.toLowerCase().includes(q) ||
    (t.description || '').toLowerCase().includes(q)
  );
  renderTopics(filtered);
});

loadTopics();