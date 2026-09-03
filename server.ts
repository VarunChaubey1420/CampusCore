import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
    });
  });

  // Chatbot endpoint for smarter student workload and study planning
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, model = "gemini-3.5-flash", workloadContext } = req.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      const ai = getGeminiClient();
      if (!ai) {
        // Graceful smart fallback when GEMINI_API_KEY is not configured yet
        const lastUserMsg = messages[messages.length - 1]?.text || "";
        const fallbackReply = generateOfflinePlan(lastUserMsg, workloadContext);
        return res.json({
          reply: fallbackReply,
          mode: "offline_fallback",
          note: "Gemini API key not detected. Showing structured offline planner assistance."
        });
      }

      // Allowed models per guidelines
      const allowedModels = [
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-3.1-pro-preview"
      ];
      const selectedModel = allowedModels.includes(model) ? model : "gemini-3.5-flash";

      // Build structured system instruction
      let systemInstruction = `You are CampusCore AI — an elite academic workload strategist, study planner, and productivity mentor for university and college students.

YOUR MISSION:
Help students make smarter, realistic, high-impact plans to manage their academic workload, conquer exams, complete assignments on time, and avoid burnout.

YOUR CAPABILITIES & PRINCIPLES:
1. Workload Triage & Smart Prioritization:
   - Apply the Eisenhower Matrix (Urgent vs. Important).
   - Differentiate high-cognitive-load deep focus work (math, programming, proofs, drafting) from low-load administrative tasks (formatting references, submitting files).
   - Encourage tackling the hardest task first ("Eat the Frog") during peak mental energy periods.

2. Realistic Time-Blocking:
   - Use structured focus sprints: 45-50 min focused block + 10 min recovery (or 25/5 Pomodoro).
   - Factor in cognitive fatigue, buffer times, and meals. Never create punishing 12-hour back-to-back schedules.

3. Actionable Deconstruction:
   - Break large assignments and vague goals (e.g. "prepare for algorithms midterm") into concrete 30-60 min bite-sized checkpoints with clear deliverables.

4. Spaced Repetition & Exam Retention:
   - Suggest active recall (practice questions, self-testing, flashcards) over passive re-reading.
   - Space review sessions across multiple days leading up to deadlines.

5. Tone & Style:
   - Encouraging, sharp, organized, and deeply empathetic to student pressure.
   - Use Markdown headers, bold highlights, bulleted timelines, and actionable checklists.

6. ONE-CLICK ACTIONABLE TASKS (CRITICAL FORMAT):
   Whenever your recommendation includes concrete tasks or study sessions that the student should add to their schedule, append a structured JSON block at the very end of your message inside an HTML comment tag:
   <!--ACTIONS:
   [
     {
       "type": "task",
       "title": "Concise task title",
       "category": "Assignment" | "Study" | "Practical",
       "priority": "High" | "Medium" | "Low",
       "dueDays": 1,
       "description": "Short action item"
     },
     {
       "type": "plan",
       "subject": "Course name",
       "topic": "Specific topic",
       "focus": "Deep focus" | "Revision",
       "duration": 60,
       "dayOffset": 1
     }
   ]
   -->
   This allows the user to click one button in the CampusCore app to instantly add your proposed sessions directly into their live Firebase Task Manager and Study Planner!`;

      if (workloadContext) {
        systemInstruction += `\n\nCURRENT STUDENT WORKLOAD CONTEXT:
- Student Name: ${workloadContext.studentName || "Student"}
- Branch & Year: ${workloadContext.branch || "Engineering"} · ${workloadContext.year || "Current Semester"}
- Current Pending Tasks (${workloadContext.pendingTasks?.length || 0}):
${(workloadContext.pendingTasks || [])
  .map(
    (t: any, i: number) =>
      `  ${i + 1}. "${t.title}" | Subject: ${t.category || "General"} | Due: ${t.due || "No date"} | Priority: ${t.priority || "Medium"}`
  )
  .join("\n")}
- Current Saved Study Roadmaps: ${workloadContext.studyPlansSummary || "None"}
Use this context to tailor specific advice without asking the student to re-enter their current tasks!`;
      }

      // Convert conversation history to Gemini contents format
      const formattedContents = messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }]
      }));

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      const reply = response.text || "I was unable to generate a plan. Please try rephrasing your prompt.";
      return res.json({ reply, model: selectedModel });
    } catch (error: any) {
      console.error("Error in /api/chat:", error);
      return res.status(500).json({
        error: error?.message || "Failed to process chat request."
      });
    }
  });

  // Development vs Production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Express v5 syntax
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CampusCore Server running on port ${PORT}`);
  });
}

function generateOfflinePlan(userMsg: string, workloadContext: any): string {
  const pending = workloadContext?.pendingTasks || [];
  const count = pending.length;

  return `### 📋 Smart Academic Workload Strategy

Here is a structured framework to organize your academic commitments:

1. **High Priority Anchor Tasks**:
   ${
     count > 0
       ? pending
           .slice(0, 3)
           .map(
             (t: any, idx: number) =>
               `- **Sprint ${idx + 1}**: ${t.title} *(Priority: ${t.priority || "High"})* — Allocate 45-60 min uninterrupted focus.`
           )
           .join("\n   ")
       : "- **Priority Sprint**: Select your most cognitively demanding assignment and tackle it first."
   }

2. **Time-Blocking Recommendation**:
   - **09:00 - 10:30**: Deep Work Block 1 (Problem solving & core theory)
   - **10:45 - 12:00**: Deep Work Block 2 (Code implementation or writing)
   - **14:00 - 15:30**: Active Recall & Revision questions
   - **16:00 - 17:00**: Administrative tasks (submissions, cleanup)

3. **Productivity Rules**:
   - **The 2-Minute Rule**: If a task takes less than 2 minutes (e.g., emailing a professor or uploading an already completed file), do it immediately.
   - **Single-Tasking**: Turn off social notifications during 45-minute sprints.

<!--ACTIONS:
[
  {
    "type": "task",
    "title": "45-min Deep Focus Sprint: High Priority Task",
    "category": "Study",
    "priority": "High",
    "dueDays": 0,
    "description": "Uninterrupted focus session using active recall"
  },
  {
    "type": "task",
    "title": "Quick Review & Submission Check",
    "category": "Assignment",
    "priority": "Medium",
    "dueDays": 1,
    "description": "Double-check rubric, citations, and upload status"
  }
]
-->`;
}

startServer();
