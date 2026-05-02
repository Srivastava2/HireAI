// app.js — HireAI Smart Recruitment Platform

// === GEMINI API CONFIGURATION ===
const GEMINI_API_KEY = "AIzaSyB4R0QtVOIkNw9kM1NiBsHnwXBEpo7BaI4"; 

// === DOM ELEMENTS ===
const dumpJobDescription = (id) => {
  const el = document.getElementById(id);
  return el && el.value.trim() ? el.value : "";
};

const dumpResumeInput = () => {
  // FIX 1: Read from the actual file input, not the dropzone div
  const fileInput = document.getElementById("resumeFile");
  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    return fileInput.files[0];
  }
  const textarea = document.getElementById("resumeText");
  return textarea ? textarea.value.trim() : "";
};

// === NAVIGATION ===
document.documentElement.style.setProperty("--transition", "all 0.3s ease");

// Smooth page transitions using opacity
const pageElements = document.querySelectorAll('main');
const originalOpacities = Array.from(pageElements).map(el => el.style.opacity = '0');

// Show page after small delay
window.addEventListener('load', () => {
  setTimeout(() => {
    Array.from(pageElements).forEach(el => el.style.opacity = '1');
  }, 50);
});

// === GEMINI API CALL (fetchJSON) ===
async function analyzeResume(jobDescription, resumeText) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    alert("⚠️ Error: Add your Gemini API key in app.js to use AI features.");
    throw new Error("Missing API Key");
  }

  const prompt = `
You are an expert recruiter AI. Analyze this resume against the job description and return ONLY a valid JSON object with these fields:
candidateName (string), 
score (number 0–100), 
matchedSkills (array of strings), 
missingSkills (array of strings), 
summary (string, 2–3 sentences), 
interviewQuestions (array of 5 strings).
Job Description: ${jobDescription}
Resume Text: ${resumeText}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "API request failed");
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    // FIX 2: Strip markdown code fences Gemini sometimes adds
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const candidateJSON = JSON.parse(cleaned);

    // Save to localStorage as current candidate
    localStorage.setItem("currentCandidate", JSON.stringify(candidateJSON));

    return candidateJSON;
  } catch (error) {
    console.error("Gemini analysis failed:", error.message);
    alert("❌ Error fetching Gemini AI analysis. Check console for details.");
    throw error;
  }
}

function extractResumeText(fileOrText) {
  if (typeof fileOrText === "string") {
    return Promise.resolve(fileOrText);
  }

  // FIX 6: PDFs can't be read as plain text. Read as text but warn user if garbled.
  // For best results users should paste text. For PDF we try readAsText (works for text-based PDFs).
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      // Check if content looks like binary PDF (starts with %PDF)
      if (text.startsWith("%PDF")) {
        // Can't parse binary PDF in browser without a library
        // Ask user to paste text instead
        alert("⚠️ Your PDF appears to be binary. For best results, please also paste the resume text in the text box below the upload area.");
        // Still proceed — Gemini may handle partial text
      }
      resolve(text);
    };
    reader.onerror = reject;
    reader.readAsText(fileOrText);
  });
}

// === SCORE ANIMATION ===
function animateScore(element, endValue) {
  let current = 0;
  const duration = 1500;
  // Prevent division by zero if score is 0
  if (endValue === 0) {
      element.textContent = "0/100";
      return;
  }
  const stepTime = Math.abs(Math.floor(duration / endValue));
  const timer = setInterval(() => {
    current += 1;
    element.textContent = current + "/100";

    if (current >= endValue) {
      clearInterval(timer);
    }
  }, stepTime);
}

// Determine circle style based on score
function setScoreClass(score) {
  if (score >= 70) return "strong";
  if (score >= 40) return "good";
  return "fair";
}

function renderResults() {
  const currentCandidate = localStorage.getItem("currentCandidate");
  if (!currentCandidate) {
    window.location.href = "upload.html";
    return;
  }

  try {
    const candidate = JSON.parse(currentCandidate);

    // FIX 3: Use correct IDs that match result.html
    const nameEl = document.getElementById("candidateName");
    if (nameEl) nameEl.textContent = candidate.candidateName;

    const initialsEl = document.getElementById("candidateInitials");
    if (initialsEl) {
      const parts = (candidate.candidateName || "??").split(" ");
      initialsEl.textContent = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
    }

    const dateEl = document.getElementById("analysisDate");
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString();

    // Score circle (SVG based in result.html)
    const scoreVal = document.getElementById("scoreValue");
    const scoreCircle = document.getElementById("scoreCircle");
    if (scoreVal && scoreCircle) {
      const score = candidate.score || 0;
      // Animate count up
      let current = 0;
      const duration = 1500;
      const step = Math.max(1, Math.floor(duration / (score || 1)));
      const timer = setInterval(() => {
        current = Math.min(current + 1, score);
        scoreVal.textContent = current;
        if (current >= score) clearInterval(timer);
      }, step);

      // Animate SVG circle (circumference = 2 * PI * 70 ≈ 440)
      const circumference = 440;
      const offset = circumference - (score / 100) * circumference;
      scoreCircle.style.transition = "stroke-dashoffset 1.5s ease";
      setTimeout(() => { scoreCircle.style.strokeDashoffset = offset; }, 100);

      // Color based on score
      if (score >= 70) scoreCircle.classList.replace("text-green-500", "text-green-400");
      else if (score >= 40) { scoreCircle.classList.remove("text-green-500"); scoreCircle.classList.add("text-yellow-400"); }
      else { scoreCircle.classList.remove("text-green-500"); scoreCircle.classList.add("text-red-400"); }
    }

    // FIX 3b: Skills use IDs in result.html
    const matchedContainer = document.getElementById("matchedSkills");
    if (matchedContainer && Array.isArray(candidate.matchedSkills)) {
      matchedContainer.innerHTML = "";
      candidate.matchedSkills.forEach(skill => {
        const tag = document.createElement("span");
        tag.className = "skill-tag matched";
        tag.textContent = skill;
        matchedContainer.appendChild(tag);
      });
    }

    const missingContainer = document.getElementById("missingSkills");
    if (missingContainer && Array.isArray(candidate.missingSkills)) {
      missingContainer.innerHTML = "";
      candidate.missingSkills.forEach(skill => {
        const tag = document.createElement("span");
        tag.className = "skill-tag missing";
        tag.textContent = skill;
        missingContainer.appendChild(tag);
      });
    }

    // FIX 3c: Summary uses ID not class
    const summaryEl = document.getElementById("aiSummary");
    if (summaryEl && candidate.summary) {
      summaryEl.textContent = candidate.summary;
    }

    // FIX 3d: Interview questions - render dynamically into #interviewQuestions
    const questionsEl = document.getElementById("interviewQuestions");
    if (questionsEl && Array.isArray(candidate.interviewQuestions)) {
      questionsEl.innerHTML = "";
      candidate.interviewQuestions.forEach((q, i) => {
        const div = document.createElement("div");
        div.className = "bg-slate-700/50 rounded-lg p-3 text-indigo-100 text-sm";
        div.innerHTML = `<span class="font-bold text-purple-400">Q${i + 1}.</span> ${q}`;
        questionsEl.appendChild(div);
      });
    }

    // FIX 3e: Save button uses ID "saveBtn" in result.html, not "saveToDashboard"
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
      saveBtn.onclick = () => {
        const existing = JSON.parse(localStorage.getItem("candidates") || "[]");
        // Avoid duplicate saves
        const alreadySaved = existing.some(c => c.candidateName === candidate.candidateName && c.score === candidate.score);
        if (alreadySaved) { alert("⚠️ Already saved to dashboard!"); return; }
        existing.push({ ...candidate, dateScreened: new Date().toISOString() });
        localStorage.setItem("candidates", JSON.stringify(existing));
        alert("✅ Saved to Dashboard!");
      };
    }

  } catch (e) {
    console.error("Rendering result failed:", e);
    alert("❌ Invalid data format from AI.");
    window.location.href = "upload.html";
  }
}

// === DASHBOARD FUNCTIONS ===
function renderDashboard() {
  const candidates = JSON.parse(localStorage.getItem("candidates") || "[]");

  // Stats
  const total = candidates.length;
  const average = total > 0
    ? Math.round(candidates.reduce((sum, c) => sum + (c.score || 0), 0) / total)
    : 0;

  const topCount = candidates.filter(c => (c.score || 0) > 70).length;

  // Render stats
  const totalEl = document.querySelector(".total-candidates");
  const avgEl = document.querySelector(".avg-score");
  const topEl = document.querySelector(".top-candidates");

  if(totalEl) totalEl.innerText = total;
  if(avgEl) avgEl.innerText = average + "/100";
  if(topEl) topEl.innerText = topCount;

  // Table rows
  const tbody = document.querySelector(".candidates-table tbody");
  if (!tbody) return; // Exit if not on dashboard page
  
  tbody.innerHTML = "";

  // Handle empty state
  const emptyState = document.getElementById("emptyState");
  if (candidates.length === 0) {
      if(emptyState) emptyState.style.display = "block";
      document.querySelector(".candidates-table").style.display = "none";
      return;
  } else {
      if(emptyState) emptyState.style.display = "none";
      document.querySelector(".candidates-table").style.display = "table";
  }

  candidates.forEach((c, index) => {
    const tr = document.createElement("tr");
    tr.className = `row-${c.score > 70 ? "good" : c.score >= 40 ? "fair" : "weak"}`;

    const matchedSkillsTag = c.matchedSkills ? c.matchedSkills.join(", ") : "N/A";
    const date = new Date(c.dateScreened || Date.now()).toLocaleDateString();

    tr.innerHTML = `
      <td>${c.candidateName}</td>
      <td>
        <span class="score-badge" style="padding:0.25rem 0.75rem;border-radius:9999px;background:${c.score >= 70 ? 'rgba(16,185,129,0.2)' : c.score >= 40 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'};color:${c.score >= 70 ? '#10b981' : c.score >= 40 ? '#f59e0b' : '#ef4444'};font-weight:700;">${c.score}</span>
      </td>
      <td>${matchedSkillsTag}</td>
      <td>${date}</td>
      <td class="action-cell text-center">
        <button data-index="${index}" class="btn-icon delete-btn text-red-400 hover:text-red-300" aria-label="Delete">
          <i data-lucide="trash-2" class="h-5 w-5 mx-auto"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  lucide.createIcons();

  // Delete handlers
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = btn.dataset.index;
      const data = JSON.parse(localStorage.getItem("candidates") || "[]");
      data.splice(idx, 1);
      localStorage.setItem("candidates", JSON.stringify(data));
      renderDashboard(); // Re-render after deletion
    };
  });
}

// === CSV EXPORT ===
function exportToCSV() {
  const candidates = JSON.parse(localStorage.getItem("candidates") || "[]");
  if (candidates.length === 0) {
    alert("No candidates to export.");
    return;
  }

  let csv = "Name,Score,Matched Skills,Missing Skills,Date Screened,Summary\n";
  candidates.forEach(c => {
    const escaped = (str) => `"${(str || "").replace(/"/g, '""')}"`;
    csv += `${escaped(c.candidateName)},${c.score},${escaped((c.matchedSkills || []).join(", "))},${escaped((c.missingSkills || []).join(", "))},${new Date(c.dateScreened || Date.now()).toLocaleString("")},${escaped(c.summary || "")}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "candidates_export.csv");
  link.click();
}

// === DASHBOARD CLEAR ===
function clearDashboard() {
  const candidates = JSON.parse(localStorage.getItem("candidates") || "[]");
  if (candidates.length === 0) {
      alert("Dashboard is already empty.");
      return;
  }
  
  if (confirm("⚠️ Are you sure you want to delete all candidate data?")) {
    localStorage.removeItem("candidates");
    renderDashboard();
  }
}

// === UPLOAD HANDLERS ===
window.handleFileDrop = function(event) {
  event.preventDefault();
  const dropZone = document.getElementById("resumeDropZone");
  if (dropZone) {
    dropZone.classList.remove("border-purple-500", "bg-slate-800/80");
    if (event.dataTransfer.files.length > 0) {
      // FIX 4: Use DataTransfer to set files on actual file input
      const fileInput = document.getElementById("resumeFile");
      if (fileInput) {
        const dt = new DataTransfer();
        dt.items.add(event.dataTransfer.files[0]);
        fileInput.files = dt.files;
      }
      const fileText = document.getElementById("filename");
      if (fileText) fileText.textContent = event.dataTransfer.files[0].name;
      document.getElementById("dropZoneContent").classList.add("hidden");
      document.getElementById("selectedFile").classList.remove("hidden");
    }
  }
};

window.handleFileSelect = function(event) {
  // FIX 5: Files are already on the input, just update UI
  if (event.target.files.length > 0) {
    const fileText = document.getElementById("filename");
    if (fileText) fileText.textContent = event.target.files[0].name;
    document.getElementById("dropZoneContent").classList.add("hidden");
    document.getElementById("selectedFile").classList.remove("hidden");
  }
};

window.handleDragOver = function(event) {
  event.preventDefault();
  const dropZone = document.getElementById("resumeDropZone");
  if (dropZone) {
    dropZone.classList.add("border-purple-500", "bg-slate-800/80");
  }
};

window.handleDragLeave = function(event) {
  event.preventDefault();
  const dropZone = document.getElementById("resumeDropZone");
  if (dropZone) {
    dropZone.classList.remove("border-purple-500", "bg-slate-800/80");
  }
};

window.screenNow = async function() {
  const jobDesc = dumpJobDescription("jobDescription");
  const resumeInput = dumpResumeInput();

  if (!jobDesc || (!resumeInput)) {
    alert("Please provide a job description and at least a resume text or PDF.");
    return;
  }

  // Show spinner and hide upload UI
  const spinnerWrapper = document.getElementById("loadingSpinner");
  const btnText = document.querySelector("#screenBtn span");
  if (spinnerWrapper) spinnerWrapper.classList.remove("hidden");
  if (btnText) btnText.textContent = "Analyzing...";

  try {
    const resumeText = await extractResumeText(resumeInput);
    await analyzeResume(jobDesc, resumeText);
    // Wait slightly before redirect for UX
    setTimeout(() => {
      window.location.href = "result.html";
    }, 1000);
  } catch (error) {
    if (spinnerWrapper) spinnerWrapper.classList.add("hidden");
    if (btnText) btnText.textContent = "Screen Now";
    console.error("Screening failed:", error);
    alert("❌ Screening failed due to API or parsing error. Check console for details.");
  }
};

// === INIT LISTENERS ===
window.onload = function() {
  // Initialize icons
  lucide.createIcons();

  // 👉 NEW: Check if we are on the dashboard or result page to render data
  if (window.location.pathname.includes("dashboard.html") || document.querySelector(".candidates-table")) {
      renderDashboard();
  } else if (window.location.pathname.includes("result.html") || document.querySelector(".score-circle")) {
      renderResults();
  }

  // Setup CSV export listener
  const exportBtn = document.querySelector("#exportCsv");
  if (exportBtn) {
    exportBtn.onclick = exportToCSV;
  }

  // Setup Clear All listener
  const clearAllBtn = document.querySelector("#clearAll");
  if (clearAllBtn) {
    clearAllBtn.onclick = clearDashboard;
  }

  // Setup Drag and Drop listeners if dropzone exists
  const dropZone = document.getElementById("resumeDropZone");
  if (dropZone) {
      dropZone.addEventListener('dragover', handleDragOver);
      dropZone.addEventListener('dragleave', handleDragLeave);
      dropZone.addEventListener('drop', handleFileDrop);
      
      // Allow clicking the dropzone to trigger file input
      dropZone.addEventListener('click', () => {
          document.getElementById('resumeFile').click();
      });

      const fileInput = document.getElementById('resumeFile');
      if (fileInput) {
          fileInput.addEventListener('change', handleFileSelect);
      }
      
      // Setup remove file button
      const removeBtn = document.querySelector("#selectedFile button");
      if (removeBtn) {
          removeBtn.addEventListener('click', (e) => {
              e.stopPropagation(); // Prevent triggering the dropzone click
              dropZone.files = null;
              if (fileInput) fileInput.value = "";
              document.getElementById("dropZoneContent").classList.remove("hidden");
              document.getElementById("selectedFile").classList.add("hidden");
          });
      }
  }
};