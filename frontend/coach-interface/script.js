/**
 * SportIQ - Coach Command Center
 */

// ---------- GLOBAL DATA ----------
let athletes = JSON.parse(localStorage.getItem('coachAthletes')) || [];
let allHistory = JSON.parse(localStorage.getItem('allHistory')) || [];
let globalChart = null;
// Add with your other global variables (around line 5-10)
let riskGaugeChart = null;
let riskTrendChart = null;
let injuryRiskData = JSON.parse(localStorage.getItem('injuryRiskHistory')) || {};

// ---------- DOM ELEMENTS ----------
const coachLoginPage = document.getElementById('coachLoginPage');
const coachAppMain = document.getElementById('coachAppMain');
const coachLoginForm = document.getElementById('coachLoginForm');
const coachFullName = document.getElementById('coachFullName');
const navbarCoachName = document.getElementById('navbarCoachName');
const coachProfileName = document.getElementById('coachProfileName');
const coachThumbImg = document.getElementById('coachThumbImg');
const coachProfilePhoto = document.getElementById('coachProfilePhoto');
const coachProfileBadge = document.getElementById('coachProfileBadge');
const coachProfilePanel = document.getElementById('coachProfilePanel');
const coachProfileOverlay = document.getElementById('coachProfileOverlay');
const closeCoachProfileBtn = document.getElementById('closeCoachProfileBtn');
const coachPhotoUpload = document.getElementById('coachPhotoUpload');
const coachChangePhotoBtn = document.getElementById('coachChangePhotoBtn');
const coachRemovePhotoBtn = document.getElementById('coachRemovePhotoBtn');

// ---------- SHOW APP ----------
function showApp(name) {
  navbarCoachName.textContent = name;
  coachProfileName.textContent = name;
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2a5c8a&color=fff&size=128`;
  coachThumbImg.src = avatarUrl;
  coachProfilePhoto.src = avatarUrl;

  coachLoginPage.style.display = 'none';
  coachAppMain.style.display = 'flex';

  // ✅ Render immediately from localStorage (fast)
  renderAthleteTable();
  populateAnalysisSelect();

  // ✅ Then sync with backend silently in background
  fetch("https://athlete-performance-3.onrender.com/athletes/")
    .then(r => r.json())
    .then(data => {
      athletes = data.map(a => ({ id: a.id, fullName: a.full_name, sport: a.sport }));
      localStorage.setItem('coachAthletes', JSON.stringify(athletes));
      renderAthleteTable();
      populateAnalysisSelect();
    })
    .catch(() => {
      // Already rendered from localStorage above, nothing to do
    });
}

// ---------- INITIAL SETUP ----------
window.onload = function() {
  const loggedIn = sessionStorage.getItem('coachLoggedIn');
  const savedName = sessionStorage.getItem('coachName') || 'Coach';

  if (loggedIn) {
    showApp(savedName);
  } else {
    coachLoginPage.style.display = 'flex';
    coachAppMain.style.display = 'none';
  }
};

// ---------- COACH LOGIN ----------
coachLoginForm.addEventListener('submit', function(e) {
  e.preventDefault();
  let name = coachFullName.value.trim();
  if (!name) name = 'Coach';

  sessionStorage.setItem('coachLoggedIn', 'true');
  sessionStorage.setItem('coachName', name);

  showApp(name);
});

// ---------- COACH PROFILE SLIDE PANEL ----------
function openCoachProfile() {
  coachProfilePanel.classList.remove('closed');
  coachProfileOverlay.classList.add('active');
}
function closeCoachProfile() {
  coachProfilePanel.classList.add('closed');
  coachProfileOverlay.classList.remove('active');
}
coachProfileBadge.addEventListener('click', openCoachProfile);
closeCoachProfileBtn.addEventListener('click', closeCoachProfile);
coachProfileOverlay.addEventListener('click', closeCoachProfile);

coachChangePhotoBtn.addEventListener('click', () => coachPhotoUpload.click());
coachPhotoUpload.addEventListener('change', function(e) {
  if (e.target.files[0]) {
    const reader = new FileReader();
    reader.onload = ev => {
      coachThumbImg.src = ev.target.result;
      coachProfilePhoto.src = ev.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
  }
});
coachRemovePhotoBtn.addEventListener('click', function() {
  const name = navbarCoachName.textContent || 'Coach';
  const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2a5c8a&color=fff&size=128`;
  coachThumbImg.src = url;
  coachProfilePhoto.src = url;
});

// ---------- ADD ATHLETE ----------
window.addAthlete = async function() {
  const fullName = document.getElementById('athleteFullName').value.trim();
  const sport = document.getElementById('athleteSportInput').value.trim() || 'Not specified';

  if (!fullName) {
    alert('Full name required');
    return;
  }

  try {
    const response = await fetch(
      `https://athlete-performance-3.onrender.com/athletes/?full_name=${encodeURIComponent(fullName)}&sport=${encodeURIComponent(sport)}`,
      { method: "POST" }
    );
    if (!response.ok) throw new Error("Failed to save athlete");

    const data = await response.json();
    const newAthlete = { id: data.id, fullName: data.full_name, sport: data.sport };

    athletes.push(newAthlete);
    localStorage.setItem('coachAthletes', JSON.stringify(athletes));

    document.getElementById('athleteFullName').value = '';
    document.getElementById('athleteSportInput').value = '';

    renderAthleteTable();
    populateAnalysisSelect();

  } catch (err) {
    alert("Error adding athlete: " + err.message);
  }
};

// ---------- REMOVE ATHLETE ----------
window.removeAthlete = async function(athleteId) {
  if (!confirm('Are you sure you want to remove this athlete?')) return;

  const athlete = athletes.find(a => a.id === athleteId);
  if (!athlete) return;

  try {
    const response = await fetch(`https://athlete-performance-3.onrender.com/athletes/${athleteId}`, {
      method: "DELETE"
    });
    if (!response.ok) throw new Error("Failed to delete from backend");

    athletes = athletes.filter(a => a.id !== athleteId);
    localStorage.setItem('coachAthletes', JSON.stringify(athletes));

    allHistory = allHistory.filter(r => r.name !== athlete.fullName);
    localStorage.setItem('allHistory', JSON.stringify(allHistory));

    renderAthleteTable();
    populateAnalysisSelect();

    if (currentModalAthleteId === athleteId) closePlayerModal();

  } catch (err) {
    alert("Error removing athlete: " + err.message);
  }
};

// ---------- RENDER TABLE ----------
window.renderAthleteTable = function() {
  const tbody = document.getElementById('athleteTableBody');
  const searchTerm = document.getElementById('searchAthleteInput')?.value.toLowerCase() || '';
  const filtered = athletes.filter(a =>
    a.fullName.toLowerCase().includes(searchTerm) ||
    a.sport.toLowerCase().includes(searchTerm)
  );

  tbody.innerHTML = filtered.map(a => {
    const escapedName = a.fullName.replace(/'/g, "\\'");
    return `
      <tr>
        <td><i class="fas fa-user-circle me-2"></i>${a.fullName}</td>
        <td>${a.sport}</td>
        <td>
          <button type="button" class="btn-athlete" onclick="openPlayerDetailModal(${a.id}, '${escapedName}')">
            <i class="fas fa-chevron-right me-1"></i>Manage
          </button>
        </td>
        <td>
          <button type="button" class="btn-remove" onclick="removeAthlete(${a.id})">
            <i class="fas fa-trash-alt me-1"></i>Remove
          </button>
        </td>
      </tr>
    `;
  }).join('');
};

window.searchAthletes = function() { renderAthleteTable(); };

window.populateAnalysisSelect = function() {
  const select = document.getElementById('analysisAthleteSelect');
  if (athletes.length === 0) {
    select.innerHTML = '<option disabled>No athletes available</option>';
    select.disabled = true;
  } else {
    select.innerHTML = athletes.map(a =>
      `<option value="${a.id}">${a.fullName} (${a.sport})</option>`
    ).join('');
    select.disabled = false;
  }
};

// ---------- PLAYER DETAIL MODAL ----------
let currentModalAthleteId = null;

window.openPlayerDetailModal = function(athleteId, athleteName) {

  currentModalAthleteId = athleteId;

  document.getElementById('modalPlayerName').textContent = athleteName;

  // 🔥 Load real data from backend instead of localStorage
  loadMessagesFromBackend(athleteId);
  loadDatesFromBackend(athleteId);

  // Performance history can remain local (since it's chart-based)
  renderPlayerPerfHistory(athleteName);

  document.getElementById('playerDetailModal').style.display = 'flex';
};

window.closePlayerModal = function() {
  document.getElementById('playerDetailModal').style.display = 'none';
  currentModalAthleteId = null;
};

function renderBackendDates(dates) {
  const list = document.getElementById('playerDatesList');

  if (!dates.length) {
    list.innerHTML = '<p class="text-muted">No important dates yet.</p>';
    return;
  }

  list.innerHTML = dates.map(d => `
    <div class="event-item d-flex justify-content-between">
      <div>
        <span class="fw-bold">${d.event_date}</span><br>
        <span>${d.description}</span>
      </div>
      <button class="btn btn-sm btn-outline-danger"
        onclick="deleteDate(${d.id})">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `).join('');
}

window.addEventForPlayer = async function() {
  const date = document.getElementById('modalEventDate').value;
  const desc = document.getElementById('modalEventDesc').value.trim();

  if (!date || !desc) {
    alert('Please select a date and enter a description');
    return;
  }

  try {
    // ✅ FIXED: Change "http://st:8000" to "https://athlete-performance-3.onrender.com"
    const response = await fetch(
      `https://athlete-performance-3.onrender.com/dates/${currentModalAthleteId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event_date: date,
          description: desc
        })
      }
    );

    if (!response.ok) throw new Error("Failed to add date");

    document.getElementById('modalEventDate').value = '';
    document.getElementById('modalEventDesc').value = '';

    await loadDatesFromBackend(currentModalAthleteId);

  } catch (err) {
    alert("Error adding date: " + err.message);
  }
};

function renderBackendMessages(messages) {
  const list = document.getElementById('playerMessagesList');

  if (!messages.length) {
    list.innerHTML = '<p class="text-muted">No messages yet.</p>';
    return;
  }

  list.innerHTML = messages.map(msg => `
    <div class="message-item">
      <div class="d-flex justify-content-between">
        <small class="text-muted">${msg.timestamp}</small>
        <button class="btn btn-sm btn-outline-danger"
          onclick="deleteMessage(${msg.id})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <div class="mt-1">${msg.text}</div>
    </div>
  `).join('');
}

window.addMessageForPlayer = async function() {
  const text = document.getElementById('modalMessageText').value.trim();
  if (!text) {
    alert('Message cannot be empty');
    return;
  }

  try {
    const response = await fetch(
      `https://athlete-performance-3.onrender.com/messages/${currentModalAthleteId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: text
        })
      }
    );

    if (!response.ok) throw new Error("Failed to send message");

    document.getElementById('modalMessageText').value = '';

    // Reload messages from backend
    await loadMessagesFromBackend(currentModalAthleteId);

  } catch (err) {
    alert("Error sending message: " + err.message);
  }
};

function renderPlayerPerfHistory(playerName) {
  const list = document.getElementById('playerPerfHistoryList');
  const records = allHistory.filter(r => r.name === playerName);
  if (!records.length) { list.innerHTML = '<p class="text-muted">No performance data yet.</p>'; return; }
  list.innerHTML = records.map(r => `
    <div class="border-bottom pb-2 mb-2">
      <small class="text-secondary">${r.timestamp}</small><br>
      <span>⚡ ${r.speed} m/s | 🎯 ${r.accuracy}% | ❤️ ${r.endurance}%</span>
    </div>
  `).join('');
}

async function loadDatesFromBackend(athleteId) {
  try {
    const response = await fetch(
      `https://athlete-performance-3.onrender.com/dates/${athleteId}`
    );

    if (!response.ok) throw new Error("Failed to fetch dates");

    const dates = await response.json();

    renderBackendDates(dates);

  } catch (err) {
    console.error(err);
  }
}

async function deleteMessage(messageId) {
  if (!confirm("Delete this message?")) return;

  try {
    const response = await fetch(
      `https://athlete-performance-3.onrender.com/messages/${messageId}`,
      { method: "DELETE" }
    );

    if (!response.ok) throw new Error("Failed to delete");

    loadMessagesFromBackend(currentModalAthleteId);

  } catch (err) {
    alert("Error deleting message");
  }
}

async function deleteDate(dateId) {
  if (!confirm("Delete this date?")) return;

  try {
    const response = await fetch(
      `https://athlete-performance-3.onrender.com/dates/${dateId}`,
      { method: "DELETE" }
    );

    if (!response.ok) throw new Error("Failed to delete");

    loadDatesFromBackend(currentModalAthleteId);

  } catch (err) {
    alert("Error deleting date");
  }
}

async function loadMessagesFromBackend(athleteId) {
  try {
    const response = await fetch(
      `https://athlete-performance-3.onrender.com/messages/${athleteId}`
    );

    if (!response.ok) throw new Error("Failed to fetch messages");

    const messages = await response.json();

    renderBackendMessages(messages);

  } catch (err) {
    console.error(err);
  }
}

// Add to global state (around line 5-10)
let practiceSessions = JSON.parse(localStorage.getItem('practiceSessions')) || {};
let progressChart = null;
let currentChartMetric = 'speed';

// Add after existing functions

// ---------- ENHANCED VIDEO ANALYSIS WITH DATE ----------
window.analyzeAndSaveVideo = async function() {
  const select = document.getElementById("analysisAthleteSelect");
  const fileInput = document.getElementById("coachVideoUpload");
  const practiceDate = document.getElementById("practiceDate").value;

  if (!select.value) {
    alert("Select an athlete first");
    return;
  }

  if (!fileInput.files.length) {
    alert("Upload a video file first");
    return;
  }

  if (!practiceDate) {
    alert("Select practice date");
    return;
  }

  const athleteId = parseInt(select.value);
  const file = fileInput.files[0];
  const athlete = athletes.find(a => a.id === athleteId);

  const formData = new FormData();
  formData.append("file", file);

  // Get button for loading state
  const analyzeBtn = document.querySelector('button[onclick="analyzeAndSaveVideo()"]');
  const originalText = analyzeBtn.innerHTML;

  try {
    // Show loading state
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Analyzing...';
    analyzeBtn.disabled = true;

const response = await fetch(
  `https://athlete-performance-3.onrender.com/analysis/${athleteId}?practice_date=${practiceDate}`,
  {
    method: "POST",
    body: formData
  }
);

// Check if request succeeded
if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`Server error (${response.status}): ${errorText}`);
}

// Parse JSON response directly
const data = await response.json();

// Check if backend returned an error message
if (data.error) {
  throw new Error(data.error);
}

    // Save practice session with date
    const sessionData = {
      id: data.id || Date.now(),
      athleteId: athleteId,
      athleteName: athlete.fullName,
      date: practiceDate,
      speed: parseFloat(data.speed),
      accuracy: parseFloat(data.accuracy),
      endurance: parseFloat(data.endurance),
      timestamp: new Date().toISOString()
    };

    // Initialize athlete's sessions array if needed
    if (!practiceSessions[athleteId]) {
      practiceSessions[athleteId] = [];
    }

    // Add new session
    practiceSessions[athleteId].push(sessionData);
    
    // Sort by date
    practiceSessions[athleteId].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Save to localStorage
    localStorage.setItem('practiceSessions', JSON.stringify(practiceSessions));

    // Display current result
    displayCurrentResult(sessionData);

    // Update all views
    updateAthletePerformance(athleteId);
    renderPracticeHistory(athleteId);
    
    // Reset form
    fileInput.value = '';
    document.getElementById('practiceDate').value = '';

    // Show success message
    alert('Analysis complete! Session saved.');

  } catch (error) {
    console.error("Analysis error:", error);
    alert("Error analyzing video: " + error.message);
  } finally {
    // Reset button
    analyzeBtn.innerHTML = originalText;
    analyzeBtn.disabled = false;
  }
};

// Display current analysis result
function displayCurrentResult(session) {
  const latestResult = document.getElementById("latestAnalysisResult");
  const analysisDetails = document.getElementById("analysisDetails");

  latestResult.style.display = "block";
  
  analysisDetails.innerHTML = `
    <div class="d-flex justify-content-between mb-2">
      <span><strong>Date:</strong> ${session.date}</span>
    </div>
    <div class="progress-stats">
      <div class="mb-2">
        <span>⚡ Speed: ${session.speed.toFixed(2)} m/s</span>
        <div class="progress" style="height: 8px;">
          <div class="progress-bar bg-primary" style="width: ${(session.speed/15)*100}%"></div>
        </div>
      </div>
      <div class="mb-2">
        <span>🎯 Accuracy: ${session.accuracy.toFixed(1)}%</span>
        <div class="progress" style="height: 8px;">
          <div class="progress-bar bg-success" style="width: ${session.accuracy}%"></div>
        </div>
      </div>
      <div class="mb-2">
        <span>❤️ Endurance: ${session.endurance.toFixed(1)}%</span>
        <div class="progress" style="height: 8px;">
          <div class="progress-bar bg-warning" style="width: ${session.endurance}%"></div>
        </div>
      </div>
    </div>
  `;
}

// Update athlete performance (best/worst and charts)
function updateAthletePerformance(athleteId) {
  const sessions = practiceSessions[athleteId] || [];
  
  if (sessions.length === 0) {
    document.getElementById('bestPerformanceContent').innerHTML = 
      '<div class="empty-state small">No sessions yet</div>';
    document.getElementById('worstPerformanceContent').innerHTML = 
      '<div class="empty-state small">No sessions yet</div>';
    document.getElementById('improvementSuggestion').style.display = 'none';
    return;
  }

  // Calculate best and worst for each metric
  const bestWorst = {
    speed: { best: null, worst: null },
    accuracy: { best: null, worst: null },
    endurance: { best: null, worst: null }
  };

  ['speed', 'accuracy', 'endurance'].forEach(metric => {
    const values = sessions.map(s => s[metric]);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    
    bestWorst[metric].best = sessions.find(s => s[metric] === maxValue);
    bestWorst[metric].worst = sessions.find(s => s[metric] === minValue);
  });

  // Display best overall (using accuracy as primary metric)
  const bestOverall = bestWorst.accuracy.best;
  const worstOverall = bestWorst.accuracy.worst;

  if (!bestOverall || !worstOverall) {
    document.getElementById('bestPerformanceContent').innerHTML = 
        '<div class="empty-state small">Insufficient data</div>';
    document.getElementById('worstPerformanceContent').innerHTML = 
        '<div class="empty-state small">Insufficient data</div>';
    document.getElementById('improvementSuggestion').style.display = 'none';
    return;
}

  // Best Performance Content
  document.getElementById('bestPerformanceContent').innerHTML = `
    <div class="comparison-item">
      <span class="comparison-label">Date</span>
      <span class="comparison-value">${bestOverall.date}</span>
    </div>
    <div class="comparison-item">
      <span class="comparison-label">Speed</span>
      <span class="comparison-value">${bestOverall.speed.toFixed(2)} m/s</span>
    </div>
    <div class="comparison-item">
      <span class="comparison-label">Accuracy</span>
      <span class="comparison-value">${bestOverall.accuracy.toFixed(1)}%</span>
    </div>
    <div class="comparison-item">
      <span class="comparison-label">Endurance</span>
      <span class="comparison-value">${bestOverall.endurance.toFixed(1)}%</span>
    </div>
  `;

  // Worst Performance Content
  document.getElementById('worstPerformanceContent').innerHTML = `
    <div class="comparison-item">
      <span class="comparison-label">Date</span>
      <span class="comparison-value">${worstOverall.date}</span>
    </div>
    <div class="comparison-item">
      <span class="comparison-label">Speed</span>
      <span class="comparison-value">${worstOverall.speed.toFixed(2)} m/s</span>
    </div>
    <div class="comparison-item">
      <span class="comparison-label">Accuracy</span>
      <span class="comparison-value">${worstOverall.accuracy.toFixed(1)}%</span>
    </div>
    <div class="comparison-item">
      <span class="comparison-label">Endurance</span>
      <span class="comparison-value">${worstOverall.endurance.toFixed(1)}%</span>
    </div>
  `;

// Improvement Suggestion
if (worstOverall.accuracy === 0) {
    document.getElementById('suggestionText').innerHTML = 
        `First session recorded on ${bestOverall.date}! Keep improving!`;
} else {
    const improvement = ((bestOverall.accuracy - worstOverall.accuracy) / worstOverall.accuracy * 100).toFixed(1);
    document.getElementById('suggestionText').innerHTML = 
        `Overall accuracy improved by ${improvement}% from ${worstOverall.date} to ${bestOverall.date}!`;
}
document.getElementById('improvementSuggestion').style.display = 'flex';

  // Update progress chart
  updateProgressChart(athleteId, currentChartMetric);
}

// Switch chart metric
window.switchChart = function(metric) {
  currentChartMetric = metric;
  
  // Update active button
  ['speed', 'accuracy', 'endurance'].forEach(m => {
    document.getElementById(`chart${m.charAt(0).toUpperCase() + m.slice(1)}Btn`).classList.remove('active');
  });
  document.getElementById(`chart${metric.charAt(0).toUpperCase() + metric.slice(1)}Btn`).classList.add('active');
  
  // Update chart if athlete is selected
  const select = document.getElementById("analysisAthleteSelect");
  if (select.value) {
    updateProgressChart(parseInt(select.value), metric);
  }
};

// Update progress chart
function updateProgressChart(athleteId, metric) {
  const sessions = practiceSessions[athleteId] || [];
  const ctx = document.getElementById('performanceProgressChart').getContext('2d');
  const noDataMsg = document.getElementById('noChartDataMsg');

  if (sessions.length === 0) {
    noDataMsg.style.display = 'flex';
    if (progressChart) progressChart.destroy();
    return;
  }

  noDataMsg.style.display = 'none';

  // Sort sessions by date
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const labels = sortedSessions.map(s => s.date);
  const values = sortedSessions.map(s => s[metric]);

  if (progressChart) {
    progressChart.destroy();
  }

  progressChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: metric.charAt(0).toUpperCase() + metric.slice(1),
        data: values,
        borderColor: metric === 'speed' ? '#2a5c8a' : metric === 'accuracy' ? '#28a745' : '#ffc107',
        backgroundColor: 'rgba(42, 92, 138, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#FF6384',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: '#0b1a2a' }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// Render practice history table
function renderPracticeHistory(athleteId) {
  const sessions = practiceSessions[athleteId] || [];
  const tbody = document.getElementById('practiceHistoryTable');
  
  if (sessions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No practice sessions yet</td></tr>';
    return;
  }

  // Sort by date descending (newest first)
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));

  tbody.innerHTML = sorted.map(session => `
    <tr>
      <td>${session.date}</td>
      <td>${session.speed.toFixed(2)}</td>
      <td>${session.accuracy.toFixed(1)}%</td>
      <td>${session.endurance.toFixed(1)}%</td>
      <td>
        <button class="delete-session-btn" onclick="deleteSession(${athleteId}, ${session.id})">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// Delete a practice session
window.deleteSession = function(athleteId, sessionId) {
  if (!confirm('Delete this practice session?')) return;

  practiceSessions[athleteId] = practiceSessions[athleteId].filter(s => s.id !== sessionId);
  
  if (practiceSessions[athleteId].length === 0) {
    delete practiceSessions[athleteId];
  }
  
  localStorage.setItem('practiceSessions', JSON.stringify(practiceSessions));
  
  // Update all views
  updateAthletePerformance(athleteId);
  renderPracticeHistory(athleteId);
};

// Override populateAnalysisSelect to add athlete selection handler
const originalPopulateSelect = window.populateAnalysisSelect;
window.populateAnalysisSelect = function() {
  originalPopulateSelect();
  
  const select = document.getElementById('analysisAthleteSelect');
select.addEventListener('change', function() {
  const athleteId = parseInt(this.value);

  if (athleteId) {
    updateAthletePerformance(athleteId);
    renderPracticeHistory(athleteId);
    updateProgressChart(athleteId, currentChartMetric);

    const sessions = practiceSessions[athleteId] || [];

    if (sessions.length > 0) {
      const latestSession = sessions[sessions.length - 1];
      displayCurrentResult(latestSession);
    } else {
      document.getElementById("latestAnalysisResult").style.display = "none";
    }
  }
});
};

// Initialize with first athlete if available
function initializeAnalysisView() {
  const select = document.getElementById('analysisAthleteSelect');
  if (select && select.value) {
    const athleteId = parseInt(select.value);
    updateAthletePerformance(athleteId);
    renderPracticeHistory(athleteId);
    updateProgressChart(athleteId, currentChartMetric);
    updateInjuryRiskDisplay(athleteId);
  }
  const sessions = practiceSessions[athleteId] || [];
if (sessions.length > 0) {
  displayCurrentResult(sessions[sessions.length - 1]);
}
}

// Call initialize after render
setTimeout(initializeAnalysisView, 500);

// Update injury risk display
function updateInjuryRiskDisplay(athleteId, currentSessionRisk = null) {
  const riskHistory = injuryRiskData[athleteId] || [];
  
  // If we have a current session, add it to history
  if (currentSessionRisk) {
    riskHistory.push({
      date: currentSessionRisk.date,
      ...currentSessionRisk
    });
    
    // Keep last 10 sessions
    if (riskHistory.length > 10) riskHistory.shift();
    
    injuryRiskData[athleteId] = riskHistory;
    localStorage.setItem('injuryRiskHistory', JSON.stringify(injuryRiskData));
  }
  
  // Get latest risk data
  const latestRisk = currentSessionRisk || (riskHistory.length > 0 ? riskHistory[riskHistory.length - 1] : null);
  
  if (!latestRisk) {
    document.getElementById('injuryRiskMain').innerHTML = `
      <div class="empty-state small p-3 text-center">
        <i class="fas fa-shield-alt fa-2x mb-2 opacity-50"></i>
        <p>No injury risk data yet<br><small>Upload a video to assess risk</small></p>
      </div>
    `;
    return;
  }
  
  // Update gauge
  updateRiskGauge(latestRisk.overall_risk || 0);
  
  // Update risk badge
  const riskBadge = document.getElementById('riskLevelBadge');
  const riskLevel = latestRisk.risk_level || 'Low';
  riskBadge.textContent = riskLevel + ' Risk';
  riskBadge.className = 'risk-badge ' + riskLevel.toLowerCase();
  
  // Update risk factors
  if (latestRisk.factors) {
    document.getElementById('asymmetryValue').textContent = latestRisk.factors.asymmetry + '%';
    document.getElementById('asymmetryBar').style.width = latestRisk.factors.asymmetry + '%';
    
    document.getElementById('movementValue').textContent = latestRisk.factors.movement_quality + '%';
    document.getElementById('movementBar').style.width = latestRisk.factors.movement_quality + '%';
    
    document.getElementById('jointStressValue').textContent = latestRisk.factors.joint_stress + '%';
    document.getElementById('jointStressBar').style.width = latestRisk.factors.joint_stress + '%';
  }
  
  // Update recommendations
  updateRecommendations(latestRisk);
  
  // Update trend chart
  updateRiskTrendChart(athleteId);
}

// Update risk gauge
function updateRiskGauge(percentage) {
  const ctx = document.getElementById('riskGaugeChart').getContext('2d');
  const percentageEl = document.getElementById('riskPercentage');
  
  percentageEl.textContent = Math.round(percentage) + '%';
  
  // Determine color based on risk level
  let color = '#28a745'; // green for low
  if (percentage > 60) color = '#dc3545'; // red for high
  else if (percentage > 30) color = '#ffc107'; // yellow for moderate
  
  if (riskGaugeChart) riskGaugeChart.destroy();
  
  riskGaugeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [percentage, 100 - percentage],
        backgroundColor: [color, '#e9ecef'],
        borderWidth: 0,
        circumference: 180,
        rotation: 270
      }]
    },
    options: {
      cutout: '70%',
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false }
      }
    }
  });
}

// Update recommendations
function updateRecommendations(riskData) {
  const recsContainer = document.getElementById('riskRecommendations');
  const recsList = document.getElementById('recommendationsList');
  
  const recommendations = [];
  
  if (riskData.factors) {
    if (riskData.factors.asymmetry > 40) {
      recommendations.push('Focus on unilateral exercises to correct left-right imbalance');
    }
    if (riskData.factors.movement_quality > 50) {
      recommendations.push('Practice controlled, smooth movements; reduce jerky motions');
    }
    if (riskData.factors.joint_stress > 50) {
      recommendations.push('Avoid extreme joint angles; focus on mid-range movements');
    }
  }
  
  if (riskData.overall_risk > 60) {
    recommendations.push('⚠️ HIGH RISK: Consider rest and consultation with trainer');
  } else if (riskData.overall_risk > 30) {
    recommendations.push('Add recovery exercises to your routine');
  } else {
    recommendations.push('Continue current regimen with proper form');
  }
  
  if (recommendations.length > 0) {
    recsList.innerHTML = recommendations.map(rec => 
      `<li><i class="fas fa-check-circle"></i> ${rec}</li>`
    ).join('');
    recsContainer.style.display = 'block';
  } else {
    recsContainer.style.display = 'none';
  }
}

// Update risk trend chart
function updateRiskTrendChart(athleteId) {
  const history = injuryRiskData[athleteId] || [];
  const ctx = document.getElementById('riskTrendChart').getContext('2d');
  
  if (history.length < 2) {
    // Show placeholder if not enough data
    if (riskTrendChart) riskTrendChart.destroy();
    ctx.font = '12px Arial';
    ctx.fillStyle = '#999';
    ctx.fillText('More data needed', 20, 30);
    return;
  }
  
  const last5 = history.slice(-5);
  const labels = last5.map(h => h.date.split('-').slice(1).join('/'));
  const values = last5.map(h => h.overall_risk);
  
  if (riskTrendChart) riskTrendChart.destroy();
  
  riskTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        borderColor: '#2a5c8a',
        backgroundColor: 'rgba(42, 92, 138, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: values.map(v => 
          v > 60 ? '#dc3545' : v > 30 ? '#ffc107' : '#28a745'
        ),
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        y: { 
          beginAtZero: true, 
          max: 100,
          grid: { display: false },
          ticks: { display: false }
        },
        x: { 
          grid: { display: false },
          ticks: { font: { size: 10 } }
        }
      },
      elements: {
        line: { borderWidth: 2 }
      }
    }
  });
}

// Modify your analyzeAndSaveVideo function to include injury risk
// Find the part where you process the response and add this after saving session data:

// After getting data from response, check for injury_risk field
if (data.injury_risk) {
  const injuryRisk = {
    date: practiceDate,
    overall_risk: data.injury_risk.overall_risk,
    risk_level: data.injury_risk.risk_level,
    factors: data.injury_risk.factors
  };
  
  // Update injury risk display
  updateInjuryRiskDisplay(athleteId, injuryRisk);
}