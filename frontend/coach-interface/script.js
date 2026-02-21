/**
 * SportIQ - Coach Command Center
 */

// ---------- GLOBAL DATA ----------
let athletes = JSON.parse(localStorage.getItem('coachAthletes')) || [];
let allHistory = JSON.parse(localStorage.getItem('allHistory')) || [];
let globalChart = null;

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
  renderGlobalChart();

  // ✅ Then sync with backend silently in background
  fetch("http://localhost:8000/athletes/")
    .then(r => r.json())
    .then(data => {
      athletes = data.map(a => ({ id: a.id, fullName: a.full_name, sport: a.sport }));
      localStorage.setItem('coachAthletes', JSON.stringify(athletes));
      renderAthleteTable();
      populateAnalysisSelect();
      renderGlobalChart();
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
      `http://localhost:8000/athletes/?full_name=${encodeURIComponent(fullName)}&sport=${encodeURIComponent(sport)}`,
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
    renderGlobalChart();

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
    const response = await fetch(`http://localhost:8000/athletes/${athleteId}`, {
      method: "DELETE"
    });
    if (!response.ok) throw new Error("Failed to delete from backend");

    athletes = athletes.filter(a => a.id !== athleteId);
    localStorage.setItem('coachAthletes', JSON.stringify(athletes));

    allHistory = allHistory.filter(r => r.name !== athlete.fullName);
    localStorage.setItem('allHistory', JSON.stringify(allHistory));

    renderAthleteTable();
    populateAnalysisSelect();
    renderGlobalChart();

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

// ---------- VIDEO ANALYSIS ----------
window.analyzeAthleteVideo = async function () {

  const select = document.getElementById("analysisAthleteSelect");
  const fileInput = document.getElementById("coachVideoUpload");

  if (!select.value) {
    alert("Select an athlete first");
    return;
  }

  if (!fileInput.files.length) {
    alert("Upload a video file first");
    return;
  }

  const athleteId = parseInt(select.value);
  const file = fileInput.files[0];

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`http://localhost:8000/analysis/${athleteId}`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error("Server returned " + response.status);
    }

    console.log("Response status:", response.status);

    const data = await response.json();
    console.log("Backend response:", data);

    const { speed, accuracy, endurance } = data.metrics || {};

    // 🔥 SHOW RESULT
    const latestResult = document.getElementById("latestAnalysisResult");
    const analysisDetails = document.getElementById("analysisDetails");

    latestResult.style.display = "block";

    analysisDetails.innerHTML = `
  <div class="mt-2">
    ⚡ <strong>Speed:</strong> ${Number(speed).toFixed(2)} m/s<br>
    🎯 <strong>Accuracy:</strong> ${Number(accuracy).toFixed(1)}%<br>
    ❤️ <strong>Endurance:</strong> ${Number(endurance).toFixed(1)}%
  </div>
`;

    // 🔥 SAVE FOR CHART
    const athlete = athletes.find(a => a.id === athleteId);

    allHistory.push({
      name: athlete.fullName,
      speed,
      accuracy,
      endurance,
      timestamp: new Date().toLocaleString()
    });

    localStorage.setItem("allHistory", JSON.stringify(allHistory));

    renderGlobalChart();

  } catch (error) {
    console.error("Analyze error:", error);
    alert("Error: " + error.message);
  }
};

// ---------- GLOBAL CHART ----------
window.renderGlobalChart = function() {
  const ctx = document.getElementById('accuracyChartGlobal').getContext('2d');
  if (globalChart) globalChart.destroy();

  globalChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: athletes.map(a => a.fullName),
      datasets: [{
        label: 'Avg Accuracy (%)',
        data: athletes.map(a => {
          const records = allHistory.filter(r => r.name === a.fullName);
          if (!records.length) return 0;
          return parseFloat(
  (records.reduce((s, r) => s + parseFloat(r.accuracy), 0) / records.length).toFixed(1)
);
}),
        backgroundColor: '#2a5c8a',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: { y: { beginAtZero: true, max: 100 } }
    }
  });
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
    const response = await fetch(
      `http://localhost:8000/dates/${currentModalAthleteId}`,
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
      `http://localhost:8000/messages/${currentModalAthleteId}`,
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
      `http://localhost:8000/dates/${athleteId}`
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
      `http://localhost:8000/messages/${messageId}`,
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
      `http://localhost:8000/dates/${dateId}`,
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
      `http://localhost:8000/messages/${athleteId}`
    );

    if (!response.ok) throw new Error("Failed to fetch messages");

    const messages = await response.json();

    renderBackendMessages(messages);

  } catch (err) {
    console.error(err);
  }
}