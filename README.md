# AI Image Editor with Gemini API

## Overview

This web application provides a simple interface for editing images using text prompts powered by the Google Gemini API. It utilizes the `@google/genai` JavaScript library to interact with the Gemini API. Users can upload an image, provide instructions for edits, view the original and edited versions side-by-side, undo changes, and save the final result. All image processing relies on the Gemini API, and image data is temporarily stored in the browser's local storage.

## Features

*   **Image Upload:** Upload images in JPG, PNG, or WEBP format.
*   **AI-Powered Editing:** Enter text prompts to describe desired image modifications (e.g., "make the background blurry", "add a hat to the person").
    *   **Note:** Requires a compatible Gemini model capable of image-in, image-out editing based on prompts.
*   **Side-by-Side View:** Displays the original uploaded image and the current edited version.
*   **Undo Functionality:** Revert the last edit performed by typing "UNDO" in the instruction prompt.
*   **Local Storage:** Uses the browser's local storage to manage the original, edited, and undo image states. No server-side storage is implemented.
*   **Save Image:** Download the final edited image as either a JPG or PNG file.

## Setup

To run this application locally, you need Node.js and npm (or a compatible package manager) installed.

1.  **Clone the repository (if applicable):**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Configure API Key:**
    *   Create a file named `.env` in the project's root directory.
    *   Add your Google Gemini API key to the `.env` file:
        ```env
        VITE_GEMINI_API_KEY=YOUR_API_KEY
        ```
    *   Replace `YOUR_API_KEY` with your actual API key. You can obtain one from Google AI Studio.

4.  **Gemini Model Configuration:**
    *   Open the `main.js` file.
    *   Locate the section where the Gemini model is initialized (around line 179).
    *   Ensure the model name is set to `'gemini-2.0-flash-exp-image-generation'`, which is currently configured for image editing.
        ```javascript
        // main.js
        const modelName = 'gemini-2.0-flash-exp-image-generation';
        ```

## Running the App

1.  Start the development server:
    ```bash
    npm run dev
    ```
2.  Open your web browser and navigate to the URL provided by the development server (usually `http://localhost:5173` or similar).

## How to Use

1.  Click the "Upload Image" button and select an image file.
2.  The image will appear in both the "Original Image" and "Edited Image" sections.
3.  Enter your editing instructions in the text input field (e.g., "Change the background to a beach scene").
4.  Click the "Edit" button. The application will send the current edited image and your prompt to the Gemini API.
5.  The "Edited Image" section will update with the result from the API.
6.  To undo the last edit, type "UNDO" in the input field and click "Edit".
7.  To save the current edited image, select the desired format (JPG or PNG) from the dropdown and click the "Save" button.

## Important Notes

*   **API Costs:** Using the Gemini API may incur costs based on usage. Be sure to check the pricing details for the specific model you configure.
*   **Model Compatibility:** The core editing functionality relies on the capabilities of the Gemini model `'gemini-2.0-flash-exp-image-generation'`. This model is configured for image editing tasks. Ensure that this model or a similarly capable model is used for optimal performance.
*   **Local Storage Limitations:** Image data is stored only in your browser's local storage, which has size limits and is not persistent if cleared by the user or browser.
*   **Error Handling:** Basic error handling is included, but API responses or unexpected issues might require further debugging via the browser's developer console.
