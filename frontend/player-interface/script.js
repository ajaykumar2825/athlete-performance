/**
 * SportIQ - Athlete Hub with Login, Sliding Profile, Physical Details & Performance
 * 
 * FEATURES:
 * - Full-window login: full name (required), password hidden by dots, only letters/numbers/symbols
 * - After login: main dashboard with dates & messages (from coach)
 * - Profile badge shows full name, click to slide profile panel from right
 * - Profile: editable physical details (age, height, weight, sport), profile photo upload/remove
 * - Performance data injected by coach backend
 * - No placeholder/demo data inside messages/dates/performance - pure empty states
 */

document.addEventListener("DOMContentLoaded", function() {
  "use strict";

  // ---------- LOGIN PAGE ----------
  const loginPage = document.getElementById('loginPage');
  const appMain = document.getElementById('appMain');
  const loginForm = document.getElementById('loginForm');
  const fullNameInput = document.getElementById('fullNameInput');
  const passwordInput = document.getElementById('passwordInput');

  // ---------- MAIN APP ELEMENTS ----------
  const profileBadge = document.getElementById('profileBadge');
  const profilePanel = document.getElementById('profilePanel');
  const profileOverlay = document.getElementById('profileOverlay');
  const closeProfileBtn = document.getElementById('closeProfileBtn');
  const navbarPlayerName = document.getElementById('navbarPlayerName');
  const profileFullNameDisplay = document.getElementById('profileFullNameDisplay');
  const profileThumbImg = document.getElementById('profileThumbImg');
  const profilePhotoMain = document.getElementById('profilePhotoMain');

  // Profile photo controls
  const profilePhotoUpload = document.getElementById('profilePhotoUpload');
  const changePhotoBtn = document.getElementById('changePhotoBtn');
  const removePhotoBtn = document.getElementById('removePhotoBtn');

  // Physical details
  const editDetailsBtn = document.getElementById('editDetailsBtn');
  const saveDetailsBtn = document.getElementById('saveDetailsBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const detailsViewMode = document.getElementById('detailsViewMode');
  const detailsEditMode = document.getElementById('detailsEditMode');
  const displayAge = document.getElementById('displayAge');
  const displayHeight = document.getElementById('displayHeight');
  const displayWeight = document.getElementById('displayWeight');
  const displaySport = document.getElementById('displaySport');
  const editAge = document.getElementById('editAge');
  const editHeight = document.getElementById('editHeight');
  const editWeight = document.getElementById('editWeight');
  const editSport = document.getElementById('editSport');

// ---------- GLOBAL STATE (add these to existing state) ----------
let currentAthlete = {
  fullName: '',
  profilePhoto: null,
  age: null,
  height: null,
  weight: null,
  sport: ''
};

// NEW: Chart and performance data state
let progressChart = null;
let currentChartMetric = 'speed';
let performanceHistory = [];
let bestPerformance = null;
let worstPerformance = null;

  // ---------- LOGIN VALIDATION & SUBMIT ----------
  // Restrict password input to letters, numbers, and common symbols
  if (passwordInput) {
    passwordInput.addEventListener('keypress', function(e) {
      const char = String.fromCharCode(e.which);
      const allowedRegex = /[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':\\|,.<>\/?~]/;
      if (!allowedRegex.test(char)) {
        e.preventDefault();
      }
    });

    // Paste restriction: remove invalid chars
    passwordInput.addEventListener('paste', function(e) {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      const filtered = pasted.replace(/[^A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':\\|,.<>\/?~]/g, '');
      this.value = filtered;
    });
  }

  // Login submit
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const fullName = fullNameInput.value.trim();
    if (!fullName) {
      alert('Please enter your full name (including surname)');
      return;
    }

    // Password validation (already filtered, but double-check)
    const password = passwordInput.value;
    const passwordRegex = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':\\|,.<>\/?~]*$/;
    if (!passwordRegex.test(password)) {
      alert('Access code contains invalid characters. Use only letters, numbers, and symbols.');
      return;
    }

    // Login success: set athlete name
    currentAthlete.fullName = fullName;
    
    // Update UI with full name
    navbarPlayerName.textContent = fullName;
    profileFullNameDisplay.textContent = fullName;
    
    // Update profile thumb and main photo with name-based avatar
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=36A2EB&color=fff&size=128`;
    profileThumbImg.src = avatarUrl;
    profilePhotoMain.src = avatarUrl;
    
    // Switch to main app
    loginPage.style.display = 'none';
    appMain.style.display = 'flex';  
    // 🔥 Connect to backend AFTER login
      connectPlayerToBackend(fullName);
  });

  // ---------- SLIDING PROFILE PANEL ----------
  function openProfilePanel() {
    profilePanel.classList.remove('closed');
    profileOverlay.classList.add('active');
  }
  function closeProfilePanel() {
    profilePanel.classList.add('closed');
    profileOverlay.classList.remove('active');
  }

  profileBadge.addEventListener('click', openProfilePanel);
  closeProfileBtn.addEventListener('click', closeProfilePanel);
  profileOverlay.addEventListener('click', closeProfilePanel);

  // ---------- PROFILE PHOTO UPLOAD & REMOVE ----------
  function triggerFileUpload() {
    profilePhotoUpload.click();
  }
  changePhotoBtn.addEventListener('click', triggerFileUpload);
  // Click on overlay also triggers
  document.querySelector('.photo-upload-overlay')?.addEventListener('click', triggerFileUpload);


  // Handle file selection
  profilePhotoUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(ev) {
        const imgData = ev.target.result;
        profileThumbImg.src = imgData;
        profilePhotoMain.src = imgData;
        currentAthlete.profilePhoto = imgData;
      };
      reader.readAsDataURL(file);
    }
  });

  // Remove photo (revert to avatar)
  removePhotoBtn.addEventListener('click', function() {
    const name = currentAthlete.fullName || 'Athlete';
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=36A2EB&color=fff&size=128`;
    profileThumbImg.src = avatarUrl;
    profilePhotoMain.src = avatarUrl;
    currentAthlete.profilePhoto = null;
  });

  // ---------- PHYSICAL DETAILS: EDIT MODE TOGGLE ----------
  editDetailsBtn.addEventListener('click', function() {
    // Pre-fill edit fields with current values
    editAge.value = currentAthlete.age || '';
    editHeight.value = currentAthlete.height || '';
    editWeight.value = currentAthlete.weight || '';
    editSport.value = currentAthlete.sport || '';
    
    detailsViewMode.style.display = 'none';
    detailsEditMode.style.display = 'block';
    editDetailsBtn.style.display = 'none';
  });

  function saveDetails() {
    const age = parseInt(editAge.value, 10);
    const height = parseInt(editHeight.value, 10);
    const weight = parseFloat(editWeight.value);
    const sport = editSport.value.trim();

    // Basic validation
    if (age && !isNaN(age) && age > 0) currentAthlete.age = age;
    if (height && !isNaN(height) && height > 100) currentAthlete.height = height;
    if (weight && !isNaN(weight) && weight > 30) currentAthlete.weight = weight;
    if (sport) currentAthlete.sport = sport;

    // Update display
    displayAge.textContent = currentAthlete.age || '—';
    displayHeight.textContent = currentAthlete.height || '—';
    displayWeight.textContent = currentAthlete.weight ? currentAthlete.weight.toFixed(1) : '—';
    displaySport.textContent = currentAthlete.sport || '—';

    // Switch back to view mode
    detailsViewMode.style.display = 'block';
    detailsEditMode.style.display = 'none';
    editDetailsBtn.style.display = 'block';
  }

  function cancelEdit() {
    detailsViewMode.style.display = 'block';
    detailsEditMode.style.display = 'none';
    editDetailsBtn.style.display = 'block';
  }

  saveDetailsBtn.addEventListener('click', saveDetails);
  cancelEditBtn.addEventListener('click', cancelEdit);

  // ---------- PUBLIC API FOR COACH BACKEND ----------
window.displayImportantDates = function(datesArray) {
  const container = document.getElementById('datesContainer');
  const noDatesMsg = document.getElementById('noDatesMessage');
  
  if (!container) return;
  container.innerHTML = '';
  
  if (!datesArray || datesArray.length === 0) {
    container.appendChild(noDatesMsg);
    return;
  }
  
  if (noDatesMsg.parentNode) noDatesMsg.remove();
  
  datesArray.forEach(item => {
    const card = document.createElement('div');
    card.className = 'date-card';
    card.innerHTML = `
      <div class="date-title">${item.title || 'Important Date'}</div>
      <div class="date-meta">
        <span><i class="far fa-calendar me-1"></i> ${item.date || ''}</span>
        ${item.type ? `<span class="date-badge"><i class="far fa-tag me-1"></i>${item.type}</span>` : ''}
      </div>
      ${item.description ? `<p class="text-muted mt-2 mb-0 small">${item.description}</p>` : ''}
    `;
    container.appendChild(card);
  });
};

  window.displayCoachMessages = function(messagesArray) {
    const container = document.getElementById('messagesContainer');
    const noMessagesMsg = document.getElementById('noMessagesMessage');
    if (!container) return;
    container.innerHTML = '';
    if (!messagesArray || messagesArray.length === 0) {
      container.appendChild(noMessagesMsg);
      return;
    }
    if (noMessagesMsg.parentNode) noMessagesMsg.remove();
    messagesArray.forEach(msg => {
      const card = document.createElement('div');
      card.className = 'message-card';
      card.innerHTML = `
        <div class="message-time">
          <i class="far fa-clock"></i> ${msg.timestamp || 'Just now'}
          ${msg.isNew ? '<span class="badge bg-danger bg-opacity-10 text-danger ms-2 px-3 py-1 rounded-pill"><i class="fas fa-circle me-1" style="font-size:0.5rem;"></i> new</span>' : ''}
        </div>
        <div class="message-content">${msg.text || ''}</div>
      `;
      container.appendChild(card);
    });
  };

// ---------- NEW: PERFORMANCE CHARTS ----------
function initializeChart() {
  const canvas = document.getElementById('progressChart');
  if (!canvas) {
    console.error('Progress chart canvas not found');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  
  if (progressChart) {
    progressChart.destroy();
  }
  
  progressChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Performance',
        data: [],
        borderColor: '#36A2EB',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#FF6384',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#0b1a2a',
          titleColor: '#fff',
          bodyColor: 'rgba(255,255,255,0.8)', // Fixed: removed # symbol
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0,0,0,0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// FIXED: Update chart with data from backend
window.updateProgressChart = function(metric, data) {
  const chartCanvas = document.getElementById('progressChart');
  const noDataMsg = document.getElementById('noChartDataMsg');
  
  // Add null checks
  if (!chartCanvas || !noDataMsg) {
    console.error('Chart elements not found');
    return;
  }
  
  // Check if data exists and has labels
  if (!data || !data.labels || data.labels.length === 0) {
    chartCanvas.style.display = 'none';
    noDataMsg.style.display = 'flex';
    return;
  }
  
  chartCanvas.style.display = 'block';
  noDataMsg.style.display = 'none';
  
  // Initialize chart if it doesn't exist
  if (!progressChart) {
    initializeChart();
    // If initialization failed, return
    if (!progressChart) return;
  }
  
  // Update chart data
  progressChart.data.labels = data.labels;
  progressChart.data.datasets[0].data = data.values;
  progressChart.data.datasets[0].label = metric.charAt(0).toUpperCase() + metric.slice(1) + ' Progress';
  progressChart.update();
};

// NEW: Display best/worst performance
window.displayBestWorstPerformance = function(best, worst) {

  const bestContainer = document.getElementById('bestPerformanceContainer');
  const worstContainer = document.getElementById('worstPerformanceContainer');

  // BEST
  if (best) {
    bestContainer.innerHTML = `
      <div class="comparison-item">
        <span class="comparison-label">Date</span>
        <span class="comparison-value">${best.practice_date}</span>
      </div>

      <div class="comparison-item">
        <span class="comparison-label">Speed</span>
        <span class="comparison-value">${best.speed.toFixed(2)} m/s</span>
      </div>

      <div class="comparison-item">
        <span class="comparison-label">Accuracy</span>
        <span class="comparison-value">${best.accuracy.toFixed(1)}%</span>
      </div>

      <div class="comparison-item">
        <span class="comparison-label">Endurance</span>
        <span class="comparison-value">${best.endurance.toFixed(1)}%</span>
      </div>
    `;
  }

  // WORST
  if (worst) {
    worstContainer.innerHTML = `
      <div class="comparison-item">
        <span class="comparison-label">Date</span>
        <span class="comparison-value">${worst.practice_date}</span>
      </div>

      <div class="comparison-item">
        <span class="comparison-label">Speed</span>
        <span class="comparison-value">${worst.speed.toFixed(2)} m/s</span>
      </div>

      <div class="comparison-item">
        <span class="comparison-label">Accuracy</span>
        <span class="comparison-value">${worst.accuracy.toFixed(1)}%</span>
      </div>

      <div class="comparison-item">
        <span class="comparison-label">Endurance</span>
        <span class="comparison-value">${worst.endurance.toFixed(1)}%</span>
      </div>
    `;
  }
};

// NEW: Chart tab switching
document.addEventListener('DOMContentLoaded', function() {
  // Add chart tab listeners
  const speedBtn = document.getElementById('chartSpeedBtn');
  const accuracyBtn = document.getElementById('chartAccuracyBtn');
  const enduranceBtn = document.getElementById('chartEnduranceBtn');
  
  if (accuracyBtn) {
    accuracyBtn.addEventListener('click', function() {
      accuracyBtn.classList.add('active');
      speedBtn.classList.remove('active');
      enduranceBtn.classList.remove('active');
      currentChartMetric = 'accuracy';
      fetchPerformanceHistory(currentAthlete.id, 'accuracy');
    });
  }
  
if (accuracyBtn) {
  accuracyBtn.addEventListener('click', function() {
    accuracyBtn.classList.add('active');
    speedBtn.classList.remove('active');
    enduranceBtn.classList.remove('active');
    currentChartMetric = 'accuracy';
    fetchPerformanceHistory(currentAthlete.id, 'accuracy');
  });
}
  
  if (enduranceBtn) {
    enduranceBtn.addEventListener('click', function() {
      enduranceBtn.classList.add('active');
      speedBtn.classList.remove('active');
      accuracyBtn.classList.remove('active');
      currentChartMetric = 'endurance';
      fetchPerformanceHistory(currentAthlete.id, 'endurance');
    });
  }
  
  // Initialize chart
  initializeChart();
});

// NEW: Fetch performance history for charts
async function fetchPerformanceHistory(athleteId, metric = 'accuracy') {
    try {
        const response = await fetch(`http://athlete-performance-3.onrender.com/performance/history/${athleteId}?metric=${metric}`);
        if (!response.ok) throw new Error('Failed to fetch performance history');
        
        const performances = await response.json();
        
        // Format for chart
        const chartData = {
            labels: performances.map(p => p.practice_date),
            values: performances.map(p => p[metric])
        };
        
        // Update chart in player interface
        if (window.updateProgressChart) {
            window.updateProgressChart(metric, chartData);
        }
        
        return performances;
    } catch (err) {
        console.error('Error fetching performance history:', err);
    }
}

// NEW: Fetch best/worst performance
async function fetchBestWorstPerformance(athleteId) {
    try {
        const response = await fetch(`http://athlete-performance-3.onrender.com/performance/bestworst/${athleteId}`);
        if (!response.ok) throw new Error('Failed to fetch best/worst performance');
        
        const data = await response.json();
        
        // Display in player interface
        if (window.displayBestWorstPerformance) {
            window.displayBestWorstPerformance(data.best, data.worst);
        }
        
        return data;
    } catch (err) {
        console.error('Error fetching best/worst:', err);
    }
}


  window.displayPerformanceData = function(performanceArray) {
    const container = document.getElementById('performanceContainer');
    const noPerfMsg = document.getElementById('noPerformanceMsg');
    if (!container) return;
    container.innerHTML = '';
    if (!performanceArray || performanceArray.length === 0) {
      container.appendChild(noPerfMsg);
      return;
    }
    if (noPerfMsg.parentNode) noPerfMsg.remove();
    performanceArray.forEach(perf => {
      const card = document.createElement('div');
      card.className = 'performance-card';
      card.innerHTML = `
        <div class="d-flex justify-content-between">
          <span class="fw-bold">${perf.metric || 'Performance'}</span>
          <span class="badge bg-primary bg-opacity-10 text-primary">${perf.value || ''} ${perf.unit || ''}</span>
        </div>
        <small class="text-muted">${perf.date || ''}</small>
      `;
      container.appendChild(card);
    });
  };

  // ---------- INITIAL EMPTY STATES ----------
  // Ensure all containers show empty states
  const datesContainer = document.getElementById('datesContainer');
  const noDatesMsg = document.getElementById('noDatesMessage');
  if (datesContainer) {
    datesContainer.innerHTML = '';
    datesContainer.appendChild(noDatesMsg);
  }

  const messagesContainer = document.getElementById('messagesContainer');
  const noMessagesMsg = document.getElementById('noMessagesMessage');
  if (messagesContainer) {
    messagesContainer.innerHTML = '';
    messagesContainer.appendChild(noMessagesMsg);
  }

  const perfContainer = document.getElementById('performanceContainer');
  const noPerfMsg = document.getElementById('noPerformanceMsg');
  if (perfContainer) {
    perfContainer.innerHTML = '';
    perfContainer.appendChild(noPerfMsg);
  }

  // ---------- CLEANUP OLD STORAGE ----------
  try {
    localStorage.removeItem('athleteHistory');
    localStorage.removeItem('athleteProfile');
  } catch (e) {}

  // 🔥 CONNECT PLAYER TO BACKEND
async function connectPlayerToBackend(fullName) {
  try {
    // 1️⃣ Get all athletes from backend
    const response = await fetch("https://athlete-performance-3.onrender.com/athletes/");
    if (!response.ok) throw new Error("Failed to fetch athletes");

    const athletes = await response.json();

    // 2️⃣ Find this player in backend list
    const athlete = athletes.find(a => a.full_name === fullName);

    if (!athlete) {
      alert("Athlete not found. Please contact your coach.");
      return;
    }

    const athleteId = athlete.id;
currentAthlete.id = athleteId;

    // 3️⃣ Fetch messages
    await fetchMessagesForPlayer(athleteId);

    // 4️⃣ Fetch important dates
    await fetchDatesForPlayer(athleteId);

    await fetchPerformanceHistory(athleteId, 'speed');
    await fetchBestWorstPerformance(athleteId);

  } catch (err) {
    console.error("Backend connection error:", err);
  }
}

// 🔥 Fetch messages for player
async function fetchMessagesForPlayer(athleteId) {
  try {
    const response = await fetch(
      `http://athlete-performance-3.onrender.com/messages/${athleteId}`
    );

    if (!response.ok) throw new Error("Failed to fetch messages");

    const messages = await response.json();

    displayCoachMessages(messages);

  } catch (err) {
    console.error("Message fetch error:", err);
  }
}

// 🔥 Fetch important dates for player
async function fetchDatesForPlayer(athleteId) {
  try {
    const response = await fetch(
      `http://athlete-performance-3.onrender.com/dates/${athleteId}`
    );

    console.log("Dates response status:", response.status);

    if (!response.ok) throw new Error("Failed to fetch dates");

    const dates = await response.json();
    console.log("Raw dates from backend:", dates);

    // ✅ IMPROVED: Better formatting with actual data
    const formatted = dates.map(d => ({
      title: d.description.length > 30 ? d.description.substring(0, 30) + "..." : d.description,
      date: d.event_date,
      description: d.description,
      type: "Coach Event"
    }));

    console.log("Formatted dates for display:", formatted);
    displayImportantDates(formatted);

  } catch (err) {
    console.error("Date fetch error:", err);
  }
}

  console.log('SportIQ: Athlete Hub ready. Awaiting coach data.');
});