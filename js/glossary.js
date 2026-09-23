import { supabase } from './supabase.js';

let glossaryCache = null;

// Load all terms once, cache in memory
async function loadGlossary() {
  if (glossaryCache) return glossaryCache;

  const { data, error } = await supabase
    .from('glossary')
    .select('term, definition');

  if (error) {
    console.error('Glossary load failed:', error);
    glossaryCache = [];
    return [];
  }

  glossaryCache = data || [];
  return glossaryCache;
}

// Wrap glossary terms inside a block of HTML text
// Usage: highlightTerms(el) where el contains text nodes
export async function highlightTerms(container) {
  const terms = await loadGlossary();
  if (!terms.length) return;

  // Sort by length descending so "fossil fuels" matches before "fuels"
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);

  // Walk text nodes only — don't touch HTML tags
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  textNodes.forEach((textNode) => {
    let html = textNode.nodeValue;
    let replaced = false;

    sorted.forEach(({ term }) => {
      // Match whole word, case-insensitive
      const regex = new RegExp(`\\b(${escapeRegex(term)})\\b`, 'gi');
      if (regex.test(html)) {
        html = html.replace(
          regex,
          `<span class="glossary-term" data-term="${escapeHtml(term)}">$1</span>`
        );
        replaced = true;
      }
    });

    if (replaced) {
      const span = document.createElement('span');
      span.innerHTML = html;
      textNode.parentNode.replaceChild(span, textNode);
    }
  });

  // Attach click handlers
  container.querySelectorAll('.glossary-term').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openGlossaryPopup(el.dataset.term, e.clientX, e.clientY);
    });
  });
}

// Popup UI
function openGlossaryPopup(term, x, y) {
  document.querySelectorAll('.glossary-popup').forEach((p) => p.remove());

  const entry = glossaryCache.find(
    (g) => g.term.toLowerCase() === term.toLowerCase()
  );
  if (!entry) return;

  const popup = document.createElement('div');
  popup.className = 'glossary-popup';
  popup.innerHTML = `
    <div class="glossary-popup-term">${escapeHtml(entry.term)}</div>
    <div class="glossary-popup-def">${escapeHtml(entry.definition)}</div>
    <button class="glossary-popup-close" aria-label="Close">&times;</button>
  `;
  document.body.appendChild(popup);

  // Position near cursor, keeping it inside viewport
  const rect = popup.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = x + 12;
  let top = y + 12;

  if (left + rect.width > vw - 12) left = x - rect.width - 12;
  if (top + rect.height > vh - 12) top = y - rect.height - 12;

  popup.style.left = `${Math.max(12, left)}px`;
  popup.style.top = `${Math.max(12, top)}px`;

  const close = () => popup.remove();
  popup.querySelector('.glossary-popup-close').addEventListener('click', close);

  // Close when clicking outside
  setTimeout(() => {
    document.addEventListener('click', function outside(e) {
      if (!popup.contains(e.target) && !e.target.classList.contains('glossary-term')) {
        close();
        document.removeEventListener('click', outside);
      }
    });
  }, 0);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}