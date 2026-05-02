// ================================
// 🔑 CONFIG
// ================================
const GEMINI_API_KEY = "PASTE_YOUR_API_KEY";

// ================================
// 📥 INPUT HELPERS
// ================================
function dumpResumeInput() {
  const fileInput = document.getElementById("resumeFile");

  if (fileInput && fileInput.files.length > 0) {
    return fileInput.files[0];
  }

  const text = document.getElementById("resumeText");
  return text ? text.value.trim() : "";
}

// ================================
// 🧠 SAFE JSON PARSE
// ================================
function safeParse(text) {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }
}

// ================================
// 🤖 AI ANALYSIS
// ================================
async function analyzeResume(jd, resume) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `
Return ONLY JSON:
{
candidateName: string,
score: number,
matchedSkills: string[],
missingSkills: string[],
summary: string,
interviewQuestions: string[]
}

Job Description: ${jd}
Resume: ${resume}
`
            }]
          }]
        })
      }
    );

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;

    const parsed = safeParse(raw);
    if (!parsed) throw new Error("Bad JSON");

    // ✅ store for result page
    localStorage.setItem("currentCandidate", JSON.stringify(parsed));

    return parsed;

  } catch (err) {
    console.error("AI FAILED:", err);

    // ✅ fallback (for demo safety)
    const fallback = {
      candidateName: "Demo Candidate",
      score: 70,
      matchedSkills: ["HTML", "CSS", "JavaScript"],
      missingSkills: ["React", "Node.js"],
      summary: "Candidate has strong basics but lacks frameworks.",
      interviewQuestions: [
        "Explain closures",
        "What is event loop?",
        "Difference between let and var?",
        "What is REST API?",
        "Explain promises"
      ]
    };

    localStorage.setItem("currentCandidate", JSON.stringify(fallback));
    return fallback;
  }
}

// ================================
// 📄 FILE READER
// ================================
function readFile(file) {
  if (typeof file === "string") return Promise.resolve(file);

  if (file.type === "application/pdf") {
    alert("⚠️ Paste resume text for better results.");
    return Promise.resolve("");
  }

  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsText(file);
  });
}

// ================================
// 🚀 SCREEN BUTTON
// ================================
window.screenNow = async function () {
  const jd = document.getElementById("jobDescription").value.trim();
  const input = dumpResumeInput();

  if (!jd || !input) {
    alert("Please fill all fields");
    return;
  }

  const text = await readFile(input);
  await analyzeResume(jd, text);

  // ✅ redirect to result
  window.location.href = "result.html";
};

// ================================
// 📊 RESULT PAGE
// ================================
function renderResults() {
  const data = localStorage.getItem("currentCandidate");

  if (!data) {
    window.location.href = "upload.html";
    return;
  }

  const c = JSON.parse(data);

  document.getElementById("candidateName").innerText = c.candidateName;
  document.getElementById("scoreValue").innerText = c.score;

  const matched = document.getElementById("matchedSkills");
  const missing = document.getElementById("missingSkills");
  const summary = document.getElementById("aiSummary");
  const questions = document.getElementById("interviewQuestions");

  if (matched) {
    matched.innerHTML = "";
    c.matchedSkills.forEach(s => {
      matched.innerHTML += `<span class="skill-tag matched">${s}</span>`;
    });
  }

  if (missing) {
    missing.innerHTML = "";
    c.missingSkills.forEach(s => {
      missing.innerHTML += `<span class="skill-tag missing">${s}</span>`;
    });
  }

  if (summary) summary.innerText = c.summary;

  if (questions) {
    questions.innerHTML = "";
    c.interviewQuestions.forEach((q, i) => {
      questions.innerHTML += `<div>Q${i + 1}. ${q}</div>`;
    });
  }

  // ✅ SAVE BUTTON
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) {
    saveBtn.onclick = () => {
      const existing = JSON.parse(localStorage.getItem("candidates") || "[]");

      existing.push({
        ...c,
        dateScreened: new Date().toISOString()
      });

      localStorage.setItem("candidates", JSON.stringify(existing));
      alert("✅ Saved to Dashboard");
    };
  }
}

// ================================
// 📋 DASHBOARD
// ================================
function renderDashboard() {
  const list = JSON.parse(localStorage.getItem("candidates") || "[]");

  const tbody = document.querySelector("tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  list.forEach(c => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${c.candidateName}</td>
      <td>${c.score}</td>
      <td>${(c.matchedSkills || []).join(", ")}</td>
      <td>${new Date(c.dateScreened).toLocaleDateString()}</td>
    `;

    tbody.appendChild(tr);
  });
}

// ================================
// 📂 UPLOAD SYSTEM (FIXED)
// ================================
window.addEventListener("DOMContentLoaded", () => {

  const fileInput = document.getElementById("resumeFile");
  const dropZone = document.getElementById("resumeDropZone");
  const fileName = document.getElementById("filename");
  const dropContent = document.getElementById("dropZoneContent");
  const selectedBox = document.getElementById("selectedFile");
  const removeBtn = document.querySelector("#selectedFile button");

  if (fileInput && dropZone) {

    dropZone.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        updateUI(e.target.files[0]);
      }
    });

    dropZone.addEventListener("dragover", e => e.preventDefault());

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();

      const file = e.dataTransfer.files[0];
      if (!file) return;

      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;

      updateUI(file);
    });

    function updateUI(file) {
      if (fileName) fileName.textContent = file.name;
      if (dropContent) dropContent.classList.add("hidden");
      if (selectedBox) selectedBox.classList.remove("hidden");
    }

    if (removeBtn) {
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput.value = "";
        dropContent.classList.remove("hidden");
        selectedBox.classList.add("hidden");
      });
    }
  }

  // page detection
  if (window.location.pathname.includes("result.html")) {
    renderResults();
  }

  if (window.location.pathname.includes("dashboard.html")) {
    renderDashboard();
  }
});
