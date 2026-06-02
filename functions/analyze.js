const Anthropic = require("@anthropic-ai/sdk");

exports.handler = async (event) => {
  try {
    const { trackerData } = JSON.parse(event.body);
    
    const client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Przeanalizuj dane trackera i daj feedback: ${JSON.stringify(trackerData)}`,
        },
      ],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        analysis: message.content[0].text,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};