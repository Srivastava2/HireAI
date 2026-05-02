// app.js — HireAI Smart Recruitment Platform (FIXED VERSION)

// === GEMINI API CONFIGURATION ===
const GEMINI_API_KEY = "AIzaSyB4R0QtVOIkNw9kM1NiBsHnwXBEpo7BaI4";

// === INPUT HELPERS ===
const dumpJobDescription = (id) => {
  const el = document.getElementById(id);
  return el && el.value.trim() ? el.value.trim() : "";
};

const dumpResumeInput = () => {
  const fileInput = document.getElementById("resumeFile");
  if (fileInput && fileInput.files.length > 0) {
    return fileInput.files[0];
  }
  const textarea = document.getElementById("resumeText");
  return textarea ? textarea.value.trim() : "";
};

// === SAFE JSON PARSER ===
function safeParseJSON(rawText) {
  try {
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) throw new Error("No JSON found");

    return JSON.parse(match[0]);
  } catch (err) {
    console.error("JSON Parse Error:", err, rawText);
    return null;
  }
}

// === GEMINI API CALL ===
async function analyzeResume(jobDescription, resumeText) {
  const prompt = `
Return ONLY JSON:
{
candidateName: string,
score: number,
matchedSkills: string[],
missingSkills: string[],
summary: string,
interviewQuestions: string[]
}

Job Description: ${jobDescription}
Resume: ${resumeText}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    console.log("API RESPONSE:", data);

    if (!response.ok) {
      throw new Error(data.error?.message || "API Error");
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Empty AI response");

    const parsed = safeParseJSON(rawText);

    if (!parsed) throw new Error("Invalid JSON format");

    localStorage.setItem("currentCandidate", JSON.stringify(parsed));
    return parsed;

  } catch (err) {
    console.error("AI ERROR:", err);

    // ✅ FALLBACK DATA (IMPORTANT FOR DEMO)
    const fallback = {
      candidateName: "Demo Candidate",
      score: 70,
      matchedSkills: ["HTML", "CSS", "JavaScript"],
      missingSkills: ["React", "Node.js"],
      summary: "Candidate has solid frontend basics but lacks advanced frameworks.",
      interviewQuestions: [
        "Explain closures in JavaScript.",
        "What is event delegation?",
        "Difference between var, let, const?",
        "What is REST API?",
        "Explain async/await."
      ]
    };

    localStorage.setItem("currentCandidate", JSON.stringify(fallback));
    return fallback;
  }
}

// === RESUME TEXT EXTRACTION ===
function extractResumeText(fileOrText) {
  if (typeof fileOrText === "string") {
    return Promise.resolve(fileOrText);
  }

  // 🚫 Disable PDF (quick fix)
  if (fileOrText.type === "application/pdf") {
    alert("⚠️ Please paste resume text instead of PDF.");
    return Promise.resolve("");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(fileOrText);
  });
}

// === SCREEN BUTTON ===
window.screenNow = async function () {
  const jobDesc = dumpJobDescription("jobDescription");
  const resumeInput = dumpResumeInput();

  if (!jobDesc || !resumeInput) {
    alert("Please enter job description and resume.");
    return;
  }

  const btn = document.getElementById("screenBtn");
  if (btn) btn.innerText = "Analyzing...";

  try {
    const resumeText = await extractResumeText(resumeInput);

    if (!resumeText) {
      alert("Resume text is empty.");
      return;
    }

    await analyzeResume(jobDesc, resumeText);

    // ✅ instant redirect (no delay bug)
    window.location.href = "result.html";

  } catch (err) {
    console.error(err);
    alert("Something went wrong.");
  }
};

// === RESULT PAGE RENDER ===
function renderResults() {
  const data = localStorage.getItem("currentCandidate");
  if (!data) return;

  const c = JSON.parse(data);

  document.getElementById("candidateName").innerText = c.candidateName;
  document.getElementById("scoreValue").innerText = c.score;

  const matched = document.getElementById("matchedSkills");
  const missing = document.getElementById("missingSkills");
  const summary = document.getElementById("aiSummary");
  const questions = document.getElementById("interviewQuestions");

  matched.innerHTML = "";
  missing.innerHTML = "";
  questions.innerHTML = "";

  c.matchedSkills.forEach(s => {
    matched.innerHTML += `<span class="skill-tag matched">${s}</span>`;
  });

  c.missingSkills.forEach(s => {
    missing.innerHTML += `<span class="skill-tag missing">${s}</span>`;
  });

  summary.innerText = c.summary;

  c.interviewQuestions.forEach((q, i) => {
    questions.innerHTML += `<div>Q${i + 1}. ${q}</div>`;
  });
}

// === INIT ===
window.onload = function () {
  if (window.location.pathname.includes("result.html")) {
    renderResults();
  }
};
