import { requireAuth, signOut } from './auth.js';

const NAV_ITEMS = [
  { href: 'index.html',        label: 'Home',          icon: '⌂' },
  { href: 'documentaries.html', label: 'Documentaries', icon: '▶' },
  { href: 'lessons.html',      label: 'Lessons',       icon: '☰' },
  { href: 'assessment.html',   label: 'Assessment',    icon: '✓' },
  { href: 'my-progress.html',  label: 'My Progress',   icon: '↗' },
  { href: 'about.html',        label: 'About',         icon: 'ⓘ' },
];

export async function initLayout(activePage) {
  const user = await requireAuth();
  if (!user) return null;

  const name = user.user_metadata.name || 'Student';

  // Render sidebar
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar-brand"><a href="index.html">DocuLearn</a></div>
      ${NAV_ITEMS.map((item) => `
        <a href="${item.href}" class="sidebar-link ${item.href === activePage ? 'active' : ''}">
          <span class="link-icon">${item.icon}</span>
          <span>${item.label}</span>
        </a>
      `).join('')}
      <div class="sidebar-footer">AP10 · Guimba</div>
    `;
  }

  // Render topbar
  const topbar = document.querySelector('.topbar');
  if (topbar) {
    topbar.innerHTML = `
      <span class="topbar-greeting">Magandang araw, ${name}!</span>
      <button class="topbar-logout" id="logout-btn">Log Out</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', signOut);
  }

  return user;
}