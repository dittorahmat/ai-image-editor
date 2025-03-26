// src/index.ts: Entry point for Gemini Flash Image Generation application
import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

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
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// API endpoint for generating images
app.post('/api/generate', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('src/index.ts: Received image generation request');
    
    // Validate request
    if (!req.file) {
      console.error('src/index.ts: No image file uploaded');
      res.status(400).json({ error: 'No image file uploaded' });
      return;
    }

    const prompt = req.body.prompt || 'Transform this image';
    const numImages = Math.min(parseInt(req.body.numImages || '6'), 6); // Max 6 images
    
    console.log(`src/index.ts: Processing request with prompt: "${prompt}"`);
    
    // Upload the file to Gemini
    const uploadResult = await fileManager.uploadFile(req.file.path, {
      mimeType: req.file.mimetype,
      displayName: req.file.originalname,
    });
    
    const file = uploadResult.file;
    console.log(`src/index.ts: Uploaded file ${file.displayName} to Gemini as: ${file.name}`);
    
    // Configure the model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp-image-generation",
    });
    
    // Generate images
    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseModalities: ["image", "text"],
      responseMimeType: "text/plain",
    };

    // Create a results directory if it doesn't exist
    const resultsDir = path.join(__dirname, '../public/results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Start the chat session
    const chatSession = model.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                mimeType: file.mimeType,
                fileUri: file.uri,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    // Request the specified number of images
    const generatedImages = [];
    
    // For multiple images, we'll send multiple requests
    for (let i = 0; i < numImages; i++) {
      try {
        console.log(`src/index.ts: Generating image ${i + 1} of ${numImages}`);
        const variation = i > 0 ? `Create a different variation. This is variation ${i + 1}.` : prompt;
        
        const result = await chatSession.sendMessage(variation);
        const candidates = result.response.candidates || [];
        
        for (let candidate_index = 0; candidate_index < candidates.length; candidate_index++) {
          const parts = candidates[candidate_index]?.content?.parts || [];
          for (let part_index = 0; part_index < parts.length; part_index++) {
            const part = parts[part_index];
            
            if (part.inlineData) {
              const uniqueId = `${Date.now()}-${i}-${candidate_index}-${part_index}`;
              const extension = part.inlineData.mimeType.split('/')[1];
              const filename = `img-${uniqueId}.${extension}`;
              const filePath = path.join(resultsDir, filename);
              
              // Save the image to the public directory
              fs.writeFileSync(filePath, Buffer.from(part.inlineData.data, 'base64'));
              console.log(`src/index.ts: Saved generated image to ${filePath}`);
              
              // Add the image path to the results
              generatedImages.push(`/results/${filename}`);
            }
          }
        }
      } catch (error) {
        console.error(`src/index.ts: Error generating image ${i + 1}:`, error);
        // Continue with other images even if one fails
      }
    }

    // Clean up the temporary uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (error) {
      console.error('src/index.ts: Error deleting temporary file:', error);
    }
    
    // Return the paths to the generated images
    console.log(`src/index.ts: Successfully generated ${generatedImages.length} images`);
    res.json({ images: generatedImages });
    
  } catch (error) {
    console.error('src/index.ts: Error processing image generation:', error);
    res.status(500).json({ error: 'Failed to generate images' });
  }
});

// Routes
app.get('/', (req: Request, res: Response): void => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`src/index.ts: Server running at http://localhost:${port}`);
}); 