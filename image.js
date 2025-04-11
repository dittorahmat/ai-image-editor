import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Load the image from the local file system
  const imagePath = "input.jpg";
  const imageData = fs.readFileSync(imagePath);
  const base64Image = imageData.toString("base64");

  // Prepare the content parts
  const contents = [
    { text: "Can you take of his glasses and give him a suit and tie?" },
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image,
      },
    },
  ];

  // Set responseModalities to include "Image" so the model can generate an image
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp-image-generation",
    contents: contents,
    config: {
      responseModalities: ["Text", "Image"],
    },
  });
  for (const part of response.candidates[0].content.parts) {
    // Based on the part type, either show the text or save the image
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData) {
      const imageData = part.inlineData.data;
      const buffer = Buffer.from(imageData, "base64");
      fs.writeFileSync("output.jpg", buffer);
      console.log("Image saved as output.jpg");
    }
  }
}

main();