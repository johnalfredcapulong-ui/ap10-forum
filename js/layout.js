import { requireAuth, signOut } from './auth.js';
import { supabase } from './supabase.js';

// Nav structure grouped by section (matches Bubble)
const NAV_GROUPS = [
  {
    label: 'Learn',
    items: [
      { href: 'index.html',         label: 'Home',          icon: '⌂' },
      { href: 'modules.html',       label: 'Modules',       icon: '▤' },
      { href: 'documentaries.html', label: 'Documentaries', icon: '▶' },
      { href: 'glossary.html',      label: 'Glossary',      icon: '❖' },
    ],
  },
  {
    label: 'Practice',
    items: [
      { href: 'activities.html',  label: 'Activities',  icon: '✎' },
      { href: 'assessment.html',  label: 'Assessment',  icon: '✓' },
      { href: 'discussion.html',  label: 'Discussion',  icon: '◌' },
    ],
  },
  {
    label: 'Track',
    items: [
      { href: 'my-progress.html', label: 'My Progress', icon: '↗' },
    ],
  },
  {
    label: 'About',
    items: [
      { href: 'about.html',  label: 'About DocuLearn', icon: 'ⓘ' },
      { href: 'search.html', label: 'Search',          icon: '⌕' },
    ],
  },
];

export async function initLayout(activePage) {
  const user = await requireAuth();
  if (!user) return null;

  const name = user.user_metadata.name || 'Student';
  const role = user.user_metadata.role || 'student';

  // Teacher-only nav items
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: [...g.items] }));
  if (role === 'teacher' || role === 'admin') {
    const trackGroup = groups.find((g) => g.label === 'Track');
    if (trackGroup) {
      trackGroup.items.push({ href: 'teacher.html', label: 'Students', icon: '☺' });
      trackGroup.items.push({ href: 'admin.html',   label: 'Admin',    icon: '⚙' });
    }
  }

  // Render sidebar
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar-brand"><a href="index.html">DocuLearn</a></div>

      ${groups.map((group) => `
        <div class="sidebar-group">
          <div class="sidebar-group-label">${group.label}</div>
          ${group.items.map((item) => `
            <a href="${item.href}" class="sidebar-link ${item.href === activePage ? 'active' : ''}">
              <span class="link-icon">${item.icon}</span>
              <span>${item.label}</span>
            </a>
          `).join('')}
        </div>
      `).join('')}

      <div class="sidebar-footer">
        <strong>Guimba, Nueva Ecija</strong>
        Connecting local stories to social understanding.
      </div>
    `;
  }

  // Render topbar
  const topbar = document.querySelector('.topbar');
  if (topbar) {
    const initials = getInitials(name);
    const notifCount = await getUnreadCount(user.id);

    topbar.innerHTML = `
      <div class="topbar-brand">DocuLearn</div>

      <div class="topbar-search">
        <input type="text" id="topbar-search-input" placeholder="Search modules, topics, or keywords..." />
      </div>

      <div class="topbar-right">
        <button class="topbar-icon-btn" id="notif-btn" aria-label="Notifications">
          🔔
          ${notifCount > 0 ? '<span class="notif-dot"></span>' : ''}
        </button>

        <div class="topbar-user" id="user-menu-btn">
          <span class="topbar-user-name">${escapeHtml(name)}</span>
          <div class="topbar-avatar">${initials}</div>
        </div>
      </div>

      <div class="topbar-dropdown" id="user-dropdown">
        <a href="my-progress.html">My Progress</a>
        <a href="about.html">About</a>
        <button id="logout-btn">Log Out</button>
      </div>
    `;

    attachTopbarHandlers();
  }

  return user;
}

// ---------- Topbar interactions ----------
function attachTopbarHandlers() {
  // User dropdown toggle
  const userBtn = document.getElementById('user-menu-btn');
  const dropdown = document.getElementById('user-dropdown');

  if (userBtn && dropdown) {
    userBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !userBtn.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', signOut);
  }

  // Search — pressing Enter navigates to search page
  const searchInput = document.getElementById('topbar-search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = e.target.value.trim();
        if (q) {
          window.location.href = `search.html?q=${encodeURIComponent(q)}`;
        }
      }
    });
  }

  // Notifications bell (visual only for now)
  const notifBtn = document.getElementById('notif-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      window.location.href = 'notifications.html';
    });
  }
}

// ---------- Helpers ----------
function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

async function getUnreadCount(userId) {
  try {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false);
    return count || 0;
  } catch {
    return 0;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
