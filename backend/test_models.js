import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel() {
  try {
    console.log("Testing gemini-pro-latest...");
    const model = genAI.getGenerativeModel({ model: "gemini-pro-latest" });
    const result = await model.generateContent("Say hello!");
    console.log("Success! Response:", result.response.text());
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testModel();
