const Anthropic = require("@anthropic-ai/sdk");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function buildUserMessage({ trackerData, goals, tasks }) {
  const lines = [];

  // CELE
  if (goals && goals.length) {
    lines.push("=== TWOJE CELE ===");
    goals.forEach(g => lines.push(`• ${g.name} (${g.detail}): ${g.badge}`));
    lines.push("");
  }

  // DANE DZIENNE
  lines.push("=== DANE Z OSTATNICH 7 DNI ===");
  const days = Object.entries(trackerData).sort(([a], [b]) => a.localeCompare(b));

  days.forEach(([date, d]) => {
    const parts = [`[${date}]`];
    if (d.trening)     parts.push(`trening=${d.trening}`);
    if (d.kcal)        parts.push(`kcal=${d.kcal}`);
    if (d.woda)        parts.push(`woda=${d.woda}ml`);
    if (d.prysznic)    parts.push(`zimny_prysznic=${d.prysznic}`);
    if (d.alkohol)     parts.push(`alkohol=${d.alkohol}`);
    if (d.nauka)       parts.push(`nauka=${d.nauka}`);
    if (d.licencjat)   parts.push(`licencjat=${d.licencjat}`);
    if (d.czytanie)    parts.push(`czytanie=${d.czytanie}min`);
    if (d.nastoj)      parts.push(`nastoj=${d.nastoj}/10`);
    if (d.energia)     parts.push(`energia=${d.energia}/10`);
    if (d.stres)       parts.push(`stres=${d.stres}/10`);
    if (d.leki)        parts.push(`leki=${d.leki}`);
    if (d.ludzie)      parts.push(`kontakt_z_ludźmi=${d.ludzie}`);
    if (d.masturbacja) parts.push(`masturbacja=${d.masturbacja}`);
    if (d.screen)      parts.push(`screen_limit=${d.screen}`);
    if (d.praca)       parts.push(`praca=${d.praca}h`);
    if (d.zarobek)     parts.push(`zarobek=${d.zarobek}zł`);
    if (d.waga)        parts.push(`waga=${d.waga}kg`);
    lines.push(parts.join(" | "));
    if (d.notatka)     lines.push(`  📝 notatka: "${d.notatka}"`);
  });

  // ZAPLANOWANE ZADANIA
  const taskEntries = Object.entries(tasks || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .filter(([, d]) => d.zadania && d.zadania.length);

  if (taskEntries.length) {
    lines.push("");
    lines.push("=== ZAPLANOWANE ZADANIA ===");
    taskEntries.forEach(([date, d]) => {
      lines.push(`[${date}]`);
      d.zadania.forEach(t => lines.push(`  ${t.done ? "✅" : "⬜"} ${t.text}`));
    });
  }

  return lines.join("\n");
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (!process.env.CLAUDE_API_KEY) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "CLAUDE_API_KEY not configured" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  if (!payload.trackerData) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Missing trackerData" }) };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 900,
      system: `Jesteś AI Coachem w aplikacji Life Grind Tracker. Analizujesz tygodniowe dane użytkownika i dajesz konkretny, szczery feedback po polsku.

ZAWSZE odpowiadaj dokładnie w tej strukturze (użyj tych nagłówków):

✅ CO IDzIE DOBRZE
[2-3 konkretne obserwacje z danych — odwołuj się do liczb i dat]

⚠️ CO WYMAGA UWAGI
[2-3 obszary gdzie dane odbiegają od celów — bądź szczery, nie owijaj w bawełnę]

📝 Z TWOICH NOTATEK
[1-2 zdania nawiązujące do tego co użytkownik napisał w notatkach — jeśli brak notatek, pomiń sekcję]

🎯 CEL NA JUTRO
[1 konkretne, wykonalne zadanie na podstawie analizy]

Zasady: używaj liczb z danych, odnoś się do celów użytkownika, sprawdzaj czy zaplanowane zadania zostały wykonane. Bądź jak dobry trener — motywuj ale mów prawdę.`,
      messages: [{ role: "user", content: buildUserMessage(payload) }],
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
