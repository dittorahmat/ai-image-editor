// src/index.ts: Entry point for Gemini Flash Image Generation application
import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
// --- DIAGNOSTIC: Check SDK version and import ---
let genaiVersion = 'unknown';
try {
  // Use 'as any' to avoid TS18046 error
  genaiVersion = require('@google/genai/package.json').version;
} catch (e: any) {
  console.log('[DIAG] Could not read @google/genai/package.json:', (e && e.message) ? e.message : e);
}
console.log(`[DIAG] Using @google/genai SDK version: ${genaiVersion}`);
import { GoogleGenAI, Modality } from "@google/genai"; // Use @google/genai as requested
// GoogleAIFileManager removed as it's not exported in this SDK version

console.log('src/index.ts: Script started, imports loaded.');
// Load environment variables
dotenv.config();

// Initialize Express application
const app = express();
const port = process.env.PORT || 3000;

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize Gemini API
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
if (!apiKey) {
  console.error('src/index.ts: Missing GOOGLE_GEMINI_API_KEY in .env file');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: apiKey }); // Initialize @google/genai client
console.log("src/index.ts: Gemini GenAI client initialized."); // Model specified in call
// const fileManager = new GoogleAIFileManager(apiKey); // Removed - Not available in this SDK version

// API endpoint for generating images
app.post('/api/generate', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  // --- DIAGNOSTIC LOGGING BLOCK ---
  console.log('[DIAG] Entered /api/generate route handler');
  console.log('[DIAG] req.headers:', req.headers);
  try {
    const bodyStr = JSON.stringify(req.body);
    console.log('[DIAG] req.body:', bodyStr.length > 500 ? bodyStr.slice(0, 500) + '...[truncated]' : bodyStr);
  } catch (e: any) {
    console.log('[DIAG] req.body: (unserializable)', (e && e.message) ? e.message : e);
  }
  console.log('[DIAG] req.file:', req.file);
  // --- END DIAGNOSTIC LOGGING BLOCK ---
  try {
    if (!req.file) {
      console.error('src/index.ts: No image file uploaded');
      res.status(400).json({ error: 'No image file uploaded' });
      return;
    }
    const prompt: string = req.body.prompt || 'Transform this image';
    const numImages: number = Math.min(parseInt(req.body.numImages || '6', 10), 6); // Max 6 images
    console.log(`[DIAG] prompt: ${prompt}`);
    console.log(`[DIAG] numImages: ${numImages}`);
    console.log(`[DIAG] req.file info:`, req.file);

    // Ensure results directory exists
    const resultsDir = path.join(__dirname, '../public/results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // --- Image Generation Logic ---
    // src/index.ts: Generate a single image using Gemini API (independent, parallel, old style)
    const generateImage = async (index: number): Promise<string | null> => {
      try {
        // Read and encode the uploaded image file
        let fileBase64 = "";
        try {
          const fileBuffer = fs.readFileSync(req.file!.path);
          fileBase64 = fileBuffer.toString("base64");
          console.log(`src/index.ts: [generateImage] Read file for image ${index + 1}, size: ${fileBuffer.length} bytes`);
        } catch (err: any) {
          console.error(`src/index.ts: [generateImage] Error reading file for image ${index + 1}:`, err?.message || err);
          return null;
        }

        // Prepare Gemini API request
        const contents = [
          { text: prompt },
          {
            inlineData: {
              mimeType: req.file!.mimetype,
              data: fileBase64,
            },
          },
        ];

        // Call Gemini API (no chat session, no history)
        let response;
        try {
          // Use ai.models.generateContent with specified model and modalities
          response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp-image-generation", // Use specified model
            contents: contents,
            config: {
              responseModalities: [Modality.TEXT, Modality.IMAGE], // Request Image modality
            },
          });
          console.log(`src/index.ts: [generateImage] Gemini API response received for image ${index + 1}`);
        } catch (apiErr: any) {
          console.error(`src/index.ts: [generateImage] Gemini API error for image ${index + 1}:`, apiErr?.message || apiErr);
          return null;
        }

        // Save the generated image (if any)
        const parts = response?.candidates?.[0]?.content?.parts || [];
        for (let partIndex = 0; partIndex < parts.length; partIndex++) {
          const part = parts[partIndex];
          if (part.inlineData) {
            const uniqueId = `${Date.now()}-${index}-${partIndex}`;
            const ext = part.inlineData.mimeType?.split("/")[1] || "jpg";
            const filename = `img-${uniqueId}.${ext}`;
            const filePath = path.join(resultsDir, filename);
            try {
              // Ensure data exists and is a string before creating buffer
              if (typeof part.inlineData.data === 'string') {
                fs.writeFileSync(filePath, Buffer.from(part.inlineData.data, "base64"));
                console.log(`src/index.ts: [generateImage] Saved image ${index + 1} as ${filePath}`);
                return `/results/${filename}`;
              } else {
                console.error(`src/index.ts: [generateImage] Invalid or missing image data for part ${partIndex} in image ${index + 1}`);
              }
              console.log(`src/index.ts: [generateImage] Saved image ${index + 1} as ${filePath}`);
              return `/results/${filename}`;
            } catch (saveErr: any) {
              console.error(`src/index.ts: [generateImage] Error saving image ${index + 1}:`, saveErr?.message || saveErr);
            }
          }
        }
        console.error(`src/index.ts: [generateImage] No image data found in Gemini response for image ${index + 1}`);
        return null;
      } catch (err: any) {
        console.error(`src/index.ts: [generateImage] Unexpected error for image ${index + 1}:`, err?.message || err);
        return null;
      }
    };

    // Run all image generations in parallel (independent)
    const generationPromises: Promise<string | null>[] = [];
    for (let i = 0; i < numImages; i++) {
      generationPromises.push(generateImage(i));
    }
    let generatedImages: string[] = [];
    try {
      const results = await Promise.all(generationPromises);
      generatedImages = results.filter((img): img is string => !!img);
      console.log(`src/index.ts: Successfully generated ${generatedImages.length} images.`);
    } catch (err: any) {
      console.error("src/index.ts: Error during parallel image generation:", err?.message || err);
    }
    // Clean up the uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (err: any) {
      console.error("src/index.ts: Error deleting uploaded file:", err?.message || err);
    }
    // Respond to client
    if (generatedImages.length > 0) {
      res.json({ images: generatedImages });
    } else {
      res.status(500).json({ error: "Failed to generate images" });
    }

  }
catch (error) {
    console.error('src/index.ts: Error processing image generation:', error);
    // Ensure uploaded file is cleaned up even on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.error('src/index.ts: Error deleting uploaded file during error handling:', cleanupErr);
      }
    }
    res.status(500).json({ error: 'Failed to generate images' });
  }
  console.log('[DIAG] End of /api/generate handler reached');
});

// Serve the frontend
app.get('/', (req: Request, res: Response): void => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});