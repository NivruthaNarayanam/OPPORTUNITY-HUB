// Function to render all saved opportunities
function renderOpportunities() {
  chrome.storage.local.get({ opportunities: [] }, (result) => {
    const list = document.getElementById('opportunity-list');
    list.innerHTML = ''; // Clear previous entries
    const opportunities = result.opportunities || [];
    opportunities.forEach(op => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${op.title}</strong><br>
                      ${op.url ? `<a href="${op.url}" target="_blank">${op.url}</a><br>` : ''}
                      ${op.notes ? `<em>${op.notes}</em>` : ''}`;
      list.appendChild(li);
    });
  });
}

// Save button click
document.getElementById('saveBtn').addEventListener('click', () => {
  const title = document.getElementById('title').value.trim();
  const url = document.getElementById('url').value.trim();
  const notes = document.getElementById('notes').value.trim();

  if (!title) { alert("Title is required"); return; }

  const manualOpportunity = { title, url, notes, timestamp: Date.now() };

  chrome.storage.local.get({ opportunities: [] }, (result) => {
    const updated = [...result.opportunities, manualOpportunity];
    chrome.storage.local.set({ opportunities: updated }, () => {
      console.log("Manual opportunity saved:", manualOpportunity);
      renderOpportunities(); // Refresh the list immediately
      // Clear input fields
      document.getElementById('title').value = '';
      document.getElementById('url').value = '';
      document.getElementById('notes').value = '';
    });
  });
});

// Initial render when popup opens
renderOpportunities();