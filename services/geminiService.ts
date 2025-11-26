import { GoogleGenAI, Type } from "@google/genai";
import { Card, Payment } from "../types";
import { format } from "date-fns";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Parse unstructured text (SMS, Email) into payment details
export const parsePaymentText = async (text: string, availableCards: Card[], referenceDate: Date = new Date()): Promise<{ amount: number; cardId?: string; paymentDay?: number, paymentMonth?: number, paymentYear?: number } | null> => {
  try {
    const cardNames = availableCards.map(c => `${c.name} (ID: ${c.id})`).join(", ");
    const todayStr = format(referenceDate, "yyyy年M月d日");
    
    const prompt = `
      Analyze the following Japanese or English text representing a credit card payment notification.
      Today is ${todayStr}.
      
      Extract:
      1. Payment amount
      2. Which credit card it belongs to (from the provided list)
      3. The target payment year and month. 
         - If the text says "October bill" or "10月分", that is the target.
         - If the text only gives a payment date (e.g., "Debit on 10th"), infer the correct month/year based on Today (${todayStr}).
           For example, if today is Nov 20th and payment is "10th", it implies Dec 10th (next month).
      
      Available Cards List: [${cardNames}]
      
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
            paymentMonth: { type: Type.INTEGER, nullable: true, description: "1-12 for Month" },
            paymentYear: { type: Type.INTEGER, nullable: true },
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