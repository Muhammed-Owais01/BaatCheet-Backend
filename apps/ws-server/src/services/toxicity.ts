import fetch from "node-fetch";
import env from "@baatcheet/env";

interface ToxicityResult {
  toxic: boolean;
  score: number;
}

export async function checkToxicity(message: string): Promise<ToxicityResult> {
  try {
    const response = await fetch(`${env.MODEL_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    console.log('Toxicity check request sent for response analysis', response);
    console.log('Toxicity API response status:', response.status);

    if (!response.ok) {
      throw new Error(`Toxicity API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data as ToxicityResult;
  } catch (err) {
    console.error("Error checking toxicity:", err);
    return { toxic: false, score: 0 }; // fail-safe: allow message if API fails
  }
}