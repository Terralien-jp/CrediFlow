import { GoogleGenAI, Type } from "@google/genai";
import { Card, Payment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Parse unstructured text (SMS, Email) into payment details
export const parsePaymentText = async (text: string, availableCards: Card[]): Promise<{ amount: number; cardId?: string; paymentDay?: number, paymentMonth?: number } | null> => {
  try {
    const cardNames = availableCards.map(c => `${c.name} (ID: ${c.id})`).join(", ");
    
    const prompt = `
      Analyze the following Japanese or English text representing a credit card payment notification.
      Extract the payment amount, the payment date (day and month), and identify which credit card it belongs to based on the provided list.
      
      Available Cards List: [${cardNames}]
      
      If the card is not explicitly named but can be inferred, do so. If unknown, leave cardId null.
      
      Text to analyze: "${text}"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            cardId: { type: Type.STRING, nullable: true },
            paymentDay: { type: Type.INTEGER, nullable: true },
            paymentMonth: { type: Type.INTEGER, nullable: true },
          },
          required: ["amount"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Gemini parse error:", error);
    return null;
  }
};

// Generate financial advice based on the schedule
export const generateFinancialAdvice = async (summaries: { bankName: string, totalAmount: number, earliestPaymentDate: string }[]): Promise<string> => {
  try {
    const dataStr = JSON.stringify(summaries);
    const prompt = `
      You are a helpful financial assistant. 
      The user has upcoming credit card payments grouped by bank account.
      Here is the summary data: ${dataStr}

      Please provide a concise, friendly summary in Japanese (日本語).
      Focus on:
      1. Which bank needs the most money and by when.
      2. A gentle reminder to transfer funds a few days before the earliest date.
      3. Keep it under 3 sentences.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "アドバイスを取得できませんでした。";
  } catch (error) {
    console.error("Gemini advice error:", error);
    return "現在AIアドバイスを利用できません。";
  }
};
