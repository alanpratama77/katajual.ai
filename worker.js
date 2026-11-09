
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/check-config") {
  return Response.json({
    hasGeminiKey: Boolean(env.GEMINI_API_KEY),
    hasAssets: Boolean(env.ASSETS)
  });
    }

    if (url.pathname === "/api/generate") {
      if (request.method !== "POST") {
        return Response.json(
          { error: "Method not allowed" },
          { status: 405 }
        );
      }

      if (!env.GEMINI_API_KEY) {
        return Response.json(
          { error: "AI configuration is missing" },
          { status: 500 }
        );
      }

      try {
        const body = await request.json();

        const product = String(body.product || "").trim();
        const benefits = String(body.benefits || "").trim();
        const tone = String(body.tone || "Persuasive");
        const language = String(body.language || "English");

        if (!product || !benefits) {
          return Response.json(
            { error: "Product and benefits are required" },
            { status: 400 }
          );
        }

        if (product.length > 150 || benefits.length > 1000) {
          return Response.json(
            { error: "Input is too long" },
            { status: 400 }
          );
        }

        const prompt = `
You are a professional e-commerce marketing copywriter.

Write marketing content for this product.

Product: ${product}
Benefits: ${benefits}
Writing tone: ${tone}
Language: ${language}

Create:
1. An attractive product title.
2. A persuasive product description.
3. A social media promotional caption.
4. A short call to action.

Use clear headings.
Be persuasive but truthful.
Do not invent product specifications or guarantees.
`;

        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": env.GEMINI_API_KEY
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }]
                }
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 700
              }
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          return Response.json(
            { error: "AI provider request failed" },
            { status: 502 }
          );
        }

        const result =
          data.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("\n");

        if (!result) {
          return Response.json(
            { error: "AI returned an empty response" },
            { status: 502 }
          );
        }

        return Response.json({ result });

      } catch (error) {
        return Response.json(
          { error: "Unable to generate content" },
          { status: 500 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
            
