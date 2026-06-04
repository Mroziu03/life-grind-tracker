const Anthropic = require("@anthropic-ai/sdk");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!process.env.CLAUDE_API_KEY) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "CLAUDE_API_KEY not configured" }),
    };
  }

  let trackerData;
  try {
    ({ trackerData } = JSON.parse(event.body || "{}"));
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  if (!trackerData) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Missing trackerData" }),
    };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system:
        "Jesteś AI Coachem dla aplikacji Life Grind Tracker. Analizujesz dane użytkownika i dajesz konkretny, motywujący feedback po polsku. Odpowiadaj zwięźle — max 4-5 zdań.",
      messages: [
        {
          role: "user",
          content: `Przeanalizuj moje dane z trackera i daj mi coaching:\n${JSON.stringify(trackerData, null, 2)}`,
        },
      ],
    });

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ analysis: message.content[0].text }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
