let allOpportunities = [];
let userProfile = { name: '', email: '', skills: '' };

function loadProfile() {
  chrome.storage.local.get({ userProfile: { name: '', email: '', skills: '' } }, (result) => {
    userProfile = result.userProfile;
    document.getElementById('profileName').value = userProfile.name || '';
    document.getElementById('profileEmail').value = userProfile.email || '';
    document.getElementById('profileSkills').value = userProfile.skills || '';
    renderDashboard(); // Re-render to apply recommendations if skills exist
  });
}

function saveProfile() {
  userProfile = {
    name: document.getElementById('profileName').value.trim(),
    email: document.getElementById('profileEmail').value.trim(),
    skills: document.getElementById('profileSkills').value.trim()
  };
  chrome.storage.local.set({ userProfile }, () => {
    alert('Profile saved successfully!');
    renderDashboard(); // Update recommendations
  });
}

function loadOpportunities() {
  chrome.storage.local.get({ opportunities: [] }, (result) => {
    allOpportunities = result.opportunities || [];
    renderDashboard();
    checkNotifications();
  });
}

function processDeadline(deadlineStr) {
  if (!deadlineStr) return null;
  const d = new Date(deadlineStr);
  return isNaN(d.getTime()) ? null : d;
}

function deleteOpportunity(timestamp) {
  if (confirm("Are you sure you want to delete this opportunity?")) {
    allOpportunities = allOpportunities.filter(op => op.timestamp !== timestamp);
    chrome.storage.local.set({ opportunities: allOpportunities }, () => {
      renderDashboard();
    });
  }
}

function checkNotifications() {
  if (!("Notification" in window)) return;

  if (Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
  }

  if (Notification.permission === "granted") {
    const now = Date.now();
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

    let needsSave = false;
    allOpportunities.forEach(op => {
      if (op.deadline && !op.notified) {
        const dDate = processDeadline(op.deadline);
        if (dDate) {
          const timeUntilDeadline = dDate.getTime() - now;
          // If deadline is within 48 hours and we haven't passed it
          if (timeUntilDeadline > 0 && timeUntilDeadline <= TWO_DAYS_MS) {
            new Notification("Upcoming Deadline!", {
              body: `${op.title} deadline is approaching on ${op.deadline}`,
              icon: "icon.png" // Fallback if you have an icon
            });
            op.notified = true;
            needsSave = true;
          }
        }
      }
    });

    if (needsSave) {
      chrome.storage.local.set({ opportunities: allOpportunities });
    }
  }
}

function getArrayFromSkills(skillsStr) {
  if (!skillsStr) return [];
  return skillsStr.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
}

function renderDashboard() {
  const tableBody = document.getElementById('opportunity-table');
  tableBody.innerHTML = '';

  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');

  if (!searchInput || !sortSelect) return;

  const searchQuery = searchInput.value.toLowerCase();
  const sortOption = sortSelect.value;
  const userSkills = getArrayFromSkills(userProfile.skills);

  // Filter
  let filtered = allOpportunities.filter(op => {
    const titleMatch = (op.title || '').toLowerCase().includes(searchQuery);
    const notesMatch = (op.notes || '').toLowerCase().includes(searchQuery);
    return titleMatch || notesMatch;
  });

  // Sort
  filtered.sort((a, b) => {
    if (sortOption === 'title_asc') {
      return (a.title || '').localeCompare(b.title || '');
    } else if (sortOption === 'deadline_asc') {
      const dateA = processDeadline(a.deadline);
      const dateB = processDeadline(b.deadline);
      if (dateA && dateB) return dateA - dateB;
      if (dateA) return -1;
      if (dateB) return 1;
      return 0;
    } else { // default date_desc
      const tsA = a.timestamp || 0;
      const tsB = b.timestamp || 0;
      return tsB - tsA;
    }
  });

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();

  filtered.forEach(op => {
    const row = document.createElement('tr');

    const opText = ((op.title || '') + ' ' + (op.notes || '')).toLowerCase();
    const isRecommended = userSkills.length > 0 && userSkills.some(skill => opText.includes(skill));

    // Highlight logic
    if (isRecommended) {
      row.classList.add('highlight-match');
    } else if (op.timestamp && (now - op.timestamp < ONE_DAY_MS)) {
      row.classList.add('highlight-new');
    }

    // Title
    const titleCell = document.createElement('td');
    titleCell.innerHTML = `<strong>${op.title || 'Unknown'}</strong>`;

    if (isRecommended) {
      titleCell.innerHTML += `<span class="badge" style="background:#ffc107; color:black;">Recommended ⭐</span>`;
    } else if (op.timestamp && (now - op.timestamp < ONE_DAY_MS)) {
      titleCell.innerHTML += `<span class="badge">New</span>`;
    }
    row.appendChild(titleCell);

    // URL
    const urlCell = document.createElement('td');
    if (op.url) {
      const link = document.createElement('a');
      link.href = op.url;
      link.target = "_blank";
      link.textContent = 'Link';
      urlCell.appendChild(link);
    } else {
      urlCell.textContent = '-';
    }
    row.appendChild(urlCell);

    // Deadline
    const deadlineCell = document.createElement('td');
    deadlineCell.textContent = op.deadline ? op.deadline : '-';
    row.appendChild(deadlineCell);

    // Notes
    const notesCell = document.createElement('td');
    const noteText = op.notes || '';
    notesCell.textContent = noteText.length > 80 ? noteText.substring(0, 80) + '...' : noteText;
    notesCell.title = noteText;
    row.appendChild(notesCell);

    // Actions (Delete)
    const actionCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'btn btn-delete';
    if (op.timestamp) {
      deleteBtn.onclick = () => deleteOpportunity(op.timestamp);
    } else {
      deleteBtn.disabled = true; // Cannot delete legacy items easily if missing timestamp
    }
    actionCell.appendChild(deleteBtn);
    row.appendChild(actionCell);

    tableBody.appendChild(row);
  });
}

// Event Listeners for UI
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const saveProfileBtn = document.getElementById('saveProfileBtn');

  if (searchInput) searchInput.addEventListener('input', renderDashboard);
  if (sortSelect) sortSelect.addEventListener('change', renderDashboard);
  if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);

  // Ask notification permission early if not set
  if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
  }

  loadProfile();
  loadOpportunities();
});

// Auto-refresh from storage to catch new opportunities
setInterval(loadOpportunities, 3000);