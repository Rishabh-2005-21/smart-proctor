import { callAI } from "./aiService.js";

// Small helper to force JSON responses from OpenAI and parse them safely
export async function callAIJson(systemPrompt, userPrompt, options = {}) {
  try {
    const raw = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      options
    );

    if (!raw) return null; // Mock mode

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        parsed = JSON.parse(raw.slice(start, end + 1));
      } else {
        throw new Error("Unable to parse JSON from AI response.");
      }
    }
    return parsed;
  } catch (error) {
    console.error("callAIJson master error:", error.message);
    return null; // Force Mock Mode on any API/parsing error
  }
}

