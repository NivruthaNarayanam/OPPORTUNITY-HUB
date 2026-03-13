// Helper to extract deadline
function extractDeadline(text) {
  if (!text) return null;
  const dateRegexes = [
    /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/i,
    /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/i,
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/i,
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th|,)?[ \s]*\d{2,4})\b/i
  ];
  for (let regex of dateRegexes) {
    const match = regex.exec(text);
    if (match) return match[1];
  }
  return null;
}

// Helper to check keywords
function containsKeywords(text) {
  if (!text) return false;
  const keywords = ['hiring', 'deadline', 'opportunity', 'register', 'apply', 'offer', 'skill'];
  return keywords.some(kw => text.toLowerCase().includes(kw));
}

// Gmail parsing
if (window.location.hostname.includes("mail.google.com")) {
  setInterval(() => {
    let emails = document.querySelectorAll('div[role="main"] .zA');
    emails.forEach(email => {
      if (email.dataset.listenerAdded) return;
      email.dataset.listenerAdded = 'true';

      email.addEventListener('click', () => {
        setTimeout(() => {
          let subjectEl = document.querySelector('h2.hP');
          let bodyEl = document.querySelector('.a3s');

          if (subjectEl && bodyEl) {
            const subject = subjectEl.innerText;
            const body = bodyEl.innerText;
            const fullText = subject + " " + body;

            if (containsKeywords(fullText)) {
              chrome.storage.local.get({ opportunities: [] }, (result) => {
                const ops = result.opportunities || [];
                if (!ops.find(o => o.notes === body)) {
                  const newOpportunity = {
                    title: subject,
                    url: window.location.href,
                    notes: body,
                    deadline: extractDeadline(fullText),
                    timestamp: Date.now()
                  };
                  ops.push(newOpportunity);
                  chrome.storage.local.set({ opportunities: ops }, () => {
                    console.log("Opportunity saved from Gmail:", newOpportunity);
                  });
                }
              });
            }
          }
        }, 1000);
      });
    });
  }, 3000);
}

// WhatsApp Web parsing
if (window.location.hostname.includes("web.whatsapp.com")) {
  setInterval(() => {
    let chats = document.querySelectorAll('div.copyable-text');
    chats.forEach(chat => {
      let text = chat.innerText;
      if (text && containsKeywords(text)) {
        chrome.storage.local.get({ opportunities: [] }, (result) => {
          const ops = result.opportunities || [];
          if (!ops.find(o => o.notes === text)) {
            const newOpportunity = {
              title: 'WhatsApp Message',
              url: '',
              notes: text,
              deadline: extractDeadline(text),
              timestamp: Date.now()
            };
            ops.push(newOpportunity);
            chrome.storage.local.set({ opportunities: ops }, () => {
              console.log('Opportunity saved from WhatsApp:', newOpportunity);
            });
          }
        });
      }
    });
  }, 5000);
}

// LinkedIn parsing
if (window.location.hostname.includes("linkedin.com")) {
  setInterval(() => {
    let posts = document.querySelectorAll('.feed-shared-update-v2__description, .update-components-text');
    posts.forEach(post => {
      let text = post.innerText;
      if (text && containsKeywords(text)) {
        chrome.storage.local.get({ opportunities: [] }, (result) => {
          const ops = result.opportunities || [];
          if (!ops.find(o => o.notes === text)) {
            const newOpportunity = {
              title: 'LinkedIn Post',
              url: window.location.href,
              notes: text,
              deadline: extractDeadline(text),
              timestamp: Date.now()
            };
            ops.push(newOpportunity);
            chrome.storage.local.set({ opportunities: ops }, () => {
              console.log('Opportunity saved from LinkedIn:', newOpportunity);
            });
          }
        });
      }
    });
  }, 5000);
}