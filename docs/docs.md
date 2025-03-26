# Gemini Flash Image Transformation - Developer Documentation

## 1. Overview

Gemini Flash is a web application that leverages Google's Gemini AI API to transform user-uploaded images based on text prompts. The application allows users to upload a reference image, provide a transformation prompt, and receive multiple AI-generated variations of their image.

The primary use case is transforming a user's character/image into a Studio Ghibli style character, but the application supports any transformation prompt the Gemini API can handle.

## 2. Tech Stack

### Frontend
- **HTML/CSS/JavaScript**: Core web technologies for the UI
- **Modern CSS**: Using CSS variables, flexbox, and grid for responsive design
- **Vanilla JavaScript**: For DOM manipulation and API communication
- **Fetch API**: For AJAX requests to the backend

### Backend
- **Node.js**: JavaScript runtime for the server
- **TypeScript**: For type safety and better developer experience
- **Express.js**: Web framework for handling HTTP requests
- **Multer**: Middleware for handling multipart/form-data (file uploads)
- **dotenv**: For environment variable management
- **@google/generative-ai**: Official Google Gemini API client
- **cors**: Middleware for enabling CORS

### Build Tools
- **TypeScript Compiler (tsc)**: For transpiling TypeScript to JavaScript
- **nodemon**: For development hot-reloading

## 3. Project Structure

```
gemini-flash/
├── dist/                 # Compiled JavaScript output
├── docs/
│   └── docs.md           # This documentation
├── node_modules/         # Dependencies
├── public/               # Static files served to clients
│   ├── index.html        # Main web interface
│   └── results/          # Generated images storage
├── src/
│   └── index.ts          # Main server code
├── uploads/              # Temporary storage for uploaded files
├── .env                  # Environment variables
├── .gitignore            # Git ignore file
├── package.json          # Project metadata and dependencies
├── package-lock.json     # Dependency lock file
├── README.md             # Project overview
└── tsconfig.json         # TypeScript configuration
```

## 4. Backend Architecture

### Entry Point (`src/index.ts`)

The backend is built with Express.js and follows a straightforward architecture:

1. **Configuration & Setup**:
   - Loading environment variables with dotenv
   - Initializing Express application
   - Setting up middleware (CORS, JSON parsing, static file serving)
   - Configuring Multer for file upload handling
   - Initializing the Gemini API client

2. **API Endpoints**:
   - `POST /api/generate`: Main endpoint for image transformation
   - `GET /`: Serves the main web interface

3. **Image Generation Process**:
   - Receive uploaded image and prompt
   - Upload image to Gemini API using GoogleAIFileManager
   - Configure and create a chat session with the Gemini model
   - Request multiple variations of the transformed image
   - Save generated images to the public/results directory
   - Return image paths to the client

### Key Components

#### Multer Configuration

```typescript
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
```

This configuration:
- Stores uploaded files in the 'uploads' directory
- Generates unique filenames using timestamps
- Limits file size to 10MB
- Accepts only image files

#### Gemini API Integration

```typescript
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// Later in the code:
const uploadResult = await fileManager.uploadFile(req.file.path, {
  mimeType: req.file.mimetype,
  displayName: req.file.originalname,
});

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp-image-generation",
});

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
```

This code:
- Initializes the Gemini API with the key from environment variables
- Creates a file manager for uploading images to Gemini
- Configures the specific model (gemini-2.0-flash-exp-image-generation)
- Creates a chat session with the uploaded image and user prompt

#### Image Generation Loop

```typescript
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
```

This code:
- Loops to generate the requested number of images
- Requests a different variation for each iteration after the first
- Processes the response to extract images
- Saves each generated image with a unique filename
- Continues processing even if individual generations fail

## 5. Frontend Architecture

The frontend is a single-page application built with vanilla HTML, CSS, and JavaScript.

### HTML Structure (`public/index.html`)

The main elements are:
- File upload section with image preview
- Prompt input field
- Generate button
- Results section to display generated images
- Loading overlay
- Error message display

### CSS Architecture

The CSS uses modern practices:
- CSS variables for theming (colors, spacing)
- Responsive design with media queries
- Flexbox and Grid for layouts
- Animations for loading spinner and hover effects
- Mobile-friendly adjustments

### JavaScript Architecture

The frontend JavaScript is organized around key functions:

1. **File Handling**:
   - `handleFileSelect()`: Processes file selection and shows preview
   - `resetFileInput()`: Clears the file input state
   - `validateForm()`: Enables/disables the generate button based on form state

2. **API Communication**:
   - `generateImages()`: Sends the form data to the backend
   - Handles loading states and error display

3. **Results Display**:
   - `displayResults()`: Creates the image cards for each result
   - Provides download functionality

4. **Utility Functions**:
   - `downloadImage()`: Handles image downloading
   - `showError()` and `hideError()`: Error message management

## 6. API Endpoints

### POST /api/generate

Generates transformed images based on an uploaded reference image and a prompt.

**Request:**
- Content-Type: multipart/form-data
- Body:
  - `image`: File - The reference image (required)
  - `prompt`: String - The transformation prompt (optional, defaults to "Transform this image")
  - `numImages`: Number - Number of images to generate (optional, defaults to 6, max 6)

**Response:**
- Content-Type: application/json
- Status:
  - 200 OK: Successfully generated images
  - 400 Bad Request: No image uploaded or invalid parameters
  - 500 Internal Server Error: Error during image generation
- Body:
  - Success: `{ images: string[] }` - Array of paths to generated images
  - Error: `{ error: string }` - Error message

## 7. Data Flow

The complete data flow through the application is:

1. **User Input**:
   - User uploads an image and enters a prompt
   - Frontend validates inputs

2. **API Request**:
   - Frontend creates FormData with image, prompt, and numImages
   - Sends POST request to /api/generate
   - Shows loading overlay

3. **Backend Processing**:
   - Receives and validates the request
   - Uploads the image to Gemini API
   - Creates a chat session with the model
   - Generates multiple image variations
   - Saves generated images to public/results directory
   - Cleans up temporary uploaded file

4. **API Response**:
   - Returns array of image paths to frontend

5. **Frontend Display**:
   - Hides loading overlay
   - Renders result cards for each image
   - Provides download buttons

## 8. Configuration

### Environment Variables (.env)

The application uses the following environment variables:
- `GOOGLE_GEMINI_API_KEY`: Required - Your Gemini API key from Google AI Studio
- `PORT`: Optional - The port for the server to listen on (default: 3000)

### TypeScript Configuration (tsconfig.json)

Notable configuration options:
- Target: ES2022
- Module: Node16
- Strict type checking enabled
- Output directory: ./dist

## 9. Development Workflow

### Setting Up Development Environment

1. Clone the repository
2. Install dependencies with `npm install`
3. Create .env file with your Gemini API key
4. Start development server with `npm run dev`

### Build Process

1. Run `npm run build` to compile TypeScript to JavaScript
2. Compiled files are output to the `dist` directory

### Common Development Tasks

1. **Modifying the UI**:
   - Edit public/index.html for layout and UI changes
   - CSS styles are included in the HTML file

2. **Adding New API Endpoints**:
   - Add new routes in src/index.ts
   - Follow the pattern of existing endpoints

3. **Changing Gemini API Parameters**:
   - Modify the generationConfig object in src/index.ts

4. **Adding More Input Fields**:
   - Add HTML in public/index.html
   - Update the form handling in the JavaScript section
   - Update the backend to process the new fields

## 10. Troubleshooting

### Common Issues

1. **"Missing GOOGLE_GEMINI_API_KEY in .env file"**
   - Ensure your .env file exists and contains a valid API key
   - Check that the key is properly formatted

2. **"No image file uploaded"**
   - Make sure the client is sending the correct field name ("image")
   - Check file size limits and file type restrictions

3. **Gemini API Errors**
   - Check API key validity
   - Ensure the model name is correct
   - Verify image format compatibility

4. **Generated Images Not Displaying**
   - Check file permissions on the public/results directory
   - Verify the paths returned from the API match the expected format
   - Check browser console for errors

### Debugging Tips

1. **Server-side Debugging**:
   - Check server logs for detailed error messages
   - Each log is prefixed with the source file for clarity
   - Use additional console.log statements as needed

2. **Client-side Debugging**:
   - Use browser developer tools to inspect network requests
   - Check browser console for JavaScript errors
   - Test the API independently using tools like Postman

## 11. Future Enhancements

Potential areas for expansion:

1. **User Authentication**:
   - Add user accounts to save generated images
   - Implement authentication middleware

2. **Advanced Options**:
   - Allow users to adjust Gemini API parameters (temperature, etc.)
   - Add more transformation options

3. **Gallery Feature**:
   - Create a gallery of previously generated images
   - Add social sharing capabilities

4. **Performance Improvements**:
   - Implement image compression before upload
   - Add caching for frequently used prompts
   - Optimize image storage and delivery

5. **Analytics**:
   - Track usage patterns
   - Gather feedback on generation quality

## 12. Known Limitations

1. **Generation Time**:
   - Image generation can take 5-30 seconds depending on complexity
   - Multiple images are generated sequentially, not in parallel

2. **API Constraints**:
   - Limited by Gemini API quotas and rate limits
   - Dependent on the capabilities of the underlying model

3. **Storage Management**:
   - No automatic cleanup of generated images
   - Could lead to disk space issues over time

4. **Error Handling**:
   - Basic error handling for common scenarios
   - Could be enhanced with more specific error messages
