// Supabase Edge Function — Claude-powered Virtual Barista
// Receives a list of vibes from the front-end, calls Anthropic, and returns
// a personalized drink recommendation as JSON.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { vibes = [], profile = null } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Anthropic API key not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const profileBlurb = profile
      ? `Their taste profile: ${JSON.stringify(profile)}.`
      : "";

    const userPrompt = `You are a coffee expert recommending a single drink.

The user just picked these vibes from a wheel: ${vibes.join(", ") || "(none)"}.
${profileBlurb}

Pick one specific coffee drink that matches their vibes. It can be a classic (cortado, latte, cold brew, pour over) or something interesting (Spanish latte, Saigon egg coffee, espresso tonic, dirty horchata, cold brew old fashioned, cardamom rose cortado).

Reply with ONLY a JSON object, nothing else, exactly in this format:
{
  "name": "Drink name (e.g. Cinnamon Honey Latte)",
  "tagline": "One short evocative line about the drink",
  "description": "2-3 sentence description: what it is, why it matches their vibes, one tip on how to make it",
  "method": "espresso | drip | pour over | cold brew | french press | aeropress",
  "matchedVibes": ["vibe1", "vibe2"]
}`;

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!apiRes.ok) {
      const errBody = await apiRes.text();
      return new Response(
        JSON.stringify({ error: "Anthropic API error", detail: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiData = await apiRes.json();
    const text: string = apiData?.content?.[0]?.text || "";
    // Extract the JSON object from Claude's reply (in case it wraps it in text)
    const match = text.match(/\{[\s\S]*\}/);
    let recommendation;
    try {
      recommendation = match ? JSON.parse(match[0]) : null;
    } catch {
      recommendation = null;
    }
    if (!recommendation) {
      recommendation = {
        name: "Coffee, dealer's choice",
        tagline: "Whatever you brew next will be the right call.",
        description: text || "Could not parse the recommendation. Try again.",
        method: "drip",
        matchedVibes: vibes,
      };
    }

    return new Response(JSON.stringify(recommendation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
