# Gemini Flash Image Transformation

A web application that uses the Gemini API to transform images based on user prompts. This application allows users to upload a reference image and provides a prompt to generate transformed versions of that image.

## Features

- Upload a reference image
- Provide a transformation prompt
- Generate 6 different transformed versions of the image
- Modern, responsive UI
- Download generated images

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
4. The API processes the request and generates 6 different transformed versions of the image
5. The application displays the generated images for the user to select from
6. The user can download any of the generated images

## Technologies Used

- TypeScript
- Express.js
- Gemini AI API
- HTML/CSS/JavaScript
- Multer for file uploads

## API Endpoints

- `POST /api/generate`: Generates transformed images from a reference image and prompt
  - Parameters:
    - `image`: The reference image file
    - `prompt`: The transformation prompt
    - `numImages`: Number of images to generate (default: 6)
  - Response:
    - `images`: Array of URLs to the generated images

## License

ISC 