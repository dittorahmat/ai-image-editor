# Gemini Flash Image Transformation

A web application that uses the Gemini API to transform images based on user prompts. This application allows users to upload a reference image and provides a prompt to generate transformed versions of that image.

## Features

- Upload a reference image
- Provide a transformation prompt
- Generate 6 different transformed versions of the image
- Modern, responsive UI
- Download generated images
- Persists generated images in the browser using IndexedDB
- Option to clear all saved images from browser storage

## Prerequisites

- Node.js (v18 or higher)
- NPM (v8 or higher)
- A valid [Google Gemini API key](https://ai.google.dev/)

## Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd gemini-flash
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   Create a `.env` file in the root directory and add your Gemini API key:
   ```
   GOOGLE_GEMINI_API_KEY=your_api_key_here
   ```

4. Build the application
   ```
   npm run build
   ```

5. Start the server
   ```
   npm start
   ```

6. Open your browser and navigate to http://localhost:3000

## Development

To run the application in development mode with hot reloading:
```
npm run dev
```

## How It Works

1. The user uploads a reference image
2. The user provides a prompt for the transformation (e.g., "turn my character into a studio ghibli character")
3. The application sends the image and prompt to the Gemini API
4. The backend uses the `gemini-2.0-flash-exp-image-generation` model via the `@google/genai` SDK to process the request and generate up to 6 different transformed versions of the image in parallel, returning the image data (base64 encoded) directly to the frontend.
5. The frontend receives the image data, displays the generated images using data URLs, and saves the image data to the browser's IndexedDB.
6. On subsequent visits, previously generated images are loaded from IndexedDB.
7. The user can download any of the generated images or clear all saved images using the provided button.

## Technologies Used

- TypeScript
- Express.js
- Google Gemini API (using `@google/genai` SDK and `gemini-2.0-flash-exp-image-generation` model)
- HTML/CSS/JavaScript
- Multer for file uploads (in-memory)
- Browser IndexedDB for image persistence

## API Endpoints

- `POST /api/generate`: Generates transformed images from a reference image and prompt
  - Parameters:
    - `image`: The reference image file
    - `prompt`: The transformation prompt
    - `numImages`: Number of images to generate (default: 6)
  - Response:
    - `images`: Array of objects, where each object contains `{ mimeType: string, data: string }` (base64 encoded image data).

## License

ISC