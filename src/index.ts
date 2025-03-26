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

    // We'll create independent chat sessions for each image in the generateImage function

    // Define a function to generate a single image independently
    const generateImage = async (index: number): Promise<string | null> => {
      try {
        console.log(`src/index.ts: Starting generation of image ${index + 1} of ${numImages}`);
        
        // Create a new chat session for each image, structured like the example
        console.log(`src/index.ts: Creating new chat session with history for image ${index + 1}`);
        
        const fullPrompt = prompt;
        console.log(`src/index.ts: Using prompt for image ${index + 1}: "${fullPrompt}"`);
        
        // Create chat session with history following the example structure
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
                { text: fullPrompt },
              ],
            },
          ],
        });
        
        // Send a simple message to trigger the generation
        console.log(`src/index.ts: Sending generation trigger message for image ${index + 1}`);
        const result = await chatSession.sendMessage("Generate an image based on the prompt and file");
        
        console.log(`src/index.ts: Received response for image ${index + 1}`);
        const candidates = result.response.candidates || [];
        console.log(`src/index.ts: Found ${candidates.length} candidates in response for image ${index + 1}`);
        
        // Log the text response if available
        try {
          const textResponse = result.response.text();
          console.log(`src/index.ts: Text response for image ${index + 1}: "${textResponse}"`);
        } catch (err) {
          console.log(`src/index.ts: No text response available for image ${index + 1}`);
        }
        
        // Log response structure (removing potentially large data properties)
        const responseClone = JSON.parse(JSON.stringify(result.response));
        // Remove potentially large binary data before logging
        if (responseClone.candidates) {
          responseClone.candidates.forEach((candidate: any) => {
            if (candidate?.content?.parts) {
              candidate.content.parts.forEach((part: any) => {
                if (part.inlineData && part.inlineData.data) {
                  part.inlineData.data = `[BINARY_DATA_LENGTH:${part.inlineData.data.length}]`;
                }
              });
            }
          });
        }
        console.log(`src/index.ts: Response structure for image ${index + 1}:`, JSON.stringify(responseClone, null, 2));
        
        // Process the response
        for (let candidate_index = 0; candidate_index < candidates.length; candidate_index++) {
          const parts = candidates[candidate_index]?.content?.parts || [];
          console.log(`src/index.ts: Processing ${parts.length} parts in candidate ${candidate_index} for image ${index + 1}`);
          
          for (let part_index = 0; part_index < parts.length; part_index++) {
            const part = parts[part_index];
            console.log(`src/index.ts: Part ${part_index} type:`, part.text ? 'text' : part.inlineData ? 'inlineData' : 'unknown');
            
            if (part.text) {
              console.log(`src/index.ts: Part ${part_index} has text content: "${part.text.substring(0, 100)}${part.text.length > 100 ? '...' : ''}"`);
            }
            
            if (part.inlineData) {
              console.log(`src/index.ts: Found inline data in part ${part_index} for image ${index + 1}`);
              const uniqueId = `${Date.now()}-${index}-${candidate_index}-${part_index}`;
              const extension = part.inlineData.mimeType.split('/')[1];
              const filename = `img-${uniqueId}.${extension}`;
              const filePath = path.join(resultsDir, filename);
              
              // Save the image to the public directory
              fs.writeFileSync(filePath, Buffer.from(part.inlineData.data, 'base64'));
              console.log(`src/index.ts: Saved generated image ${index + 1} to ${filePath}`);
              
              // Return the image path
              return `/results/${filename}`;
            }
          }
        }
        
        // No image was found in the response
        console.error(`src/index.ts: No image data found in response for image ${index + 1}`);
        return null;
      } catch (error: any) {
        console.error(`src/index.ts: Error generating image ${index + 1}:`, error);
        // Try to extract more detailed error information
        if (error.errorDetails) {
          console.error(`src/index.ts: Error details for image ${index + 1}:`, error.errorDetails);
        }
        return null;
      }
    };
    
    // Function to execute all image generation promises in parallel
    const executeAllInParallel = async (): Promise<(string | null)[]> => {
      console.log(`src/index.ts: Setting up parallel execution for all ${numImages} images at once`);
      
      // Create promises for all images
      const generationPromises = Array.from(
        { length: numImages }, 
        (_, i) => generateImage(i)
      );
      
      // Execute all promises concurrently
      console.log(`src/index.ts: Executing all ${numImages} image generations in parallel`);
      return Promise.all(generationPromises);
    };
    
    // Execute all generation processes in parallel
    console.log(`src/index.ts: Starting parallel image generation for ${numImages} images`);
    const results = await executeAllInParallel();
    console.log(`src/index.ts: All image generation completed, had ${results.filter(Boolean).length} successful generations`);
    
    // Filter out failed generations (null values)
    const generatedImages = results.filter(path => path !== null) as string[];

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