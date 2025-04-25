# Plan: Client-Side Image Storage using localStorage

This document outlines the plan to modify the Gemini Image Transformation application to store generated images in the browser's local storage instead of on the server's filesystem.

**Objective:** Shift image persistence from server-side file paths to client-side base64 data stored in `localStorage`.

**Potential Limitation:** `localStorage` has size limits (typically 5-10MB total per origin). Storing multiple high-resolution images might exceed this limit, potentially causing errors or data loss for the user.

## Phase 1: Backend Changes (`src/index.ts`)

1.  **Switch Multer Storage:** Change `multer` from `diskStorage` to `memoryStorage` to handle the uploaded file in memory.
    *   Remove the `diskStorage` configuration.
    *   Update `multer` initialization to use `memoryStorage`.
2.  **Modify `generateImage` Function:**
    *   Remove server-side file saving logic (`resultsDir`, `filePath`, `fs.writeFileSync`).
    *   Return an object `{ mimeType: string; data: string }` containing the base64 image data and its MIME type instead of a file path.
    *   Update the function's return type annotation accordingly.
3.  **Adjust Parallel Execution Logic:**
    *   Update type annotations for promises and results arrays (`generationPromises`, `generatedImages`) to reflect the new object return type.
    *   Update the type guard in the `Promise.all` result filter.
4.  **Modify API Response:**
    *   Ensure the final JSON response (`res.json({ images: ... })`) contains the array of `{ mimeType, data }` objects.
5.  **Remove File Cleanup:** Remove the `fs.unlinkSync` call for the temporary uploaded file, as it will no longer be saved to disk.

## Phase 2: Frontend Changes (`public/index.html`)

1.  **Modify `generateImages` Function:**
    *   Update the handling of the `fetch` response to expect an array of `{ mimeType, data }` objects in `data.images`.
    *   Save the received `data.images` array to `localStorage` using `localStorage.setItem('generatedImages', JSON.stringify(data.images))`.
    *   Pass the actual `data.images` array to `displayResults`.
2.  **Modify `displayResults` Function:**
    *   Update the function parameter to accept an array of image objects.
    *   Construct `data:` URLs (`data:${imageObj.mimeType};base64,${imageObj.data}`) for the `img.src` attribute.
    *   Update the download button's event listener to pass `mimeType` and `data` to the `downloadImage` function.
3.  **Modify `downloadImage` Function:**
    *   Update function parameters to accept `mimeType`, `base64Data`, and `index`.
    *   Set the download link's `href` to the `data:` URL.
    *   Generate the download filename using the index and MIME type to determine the correct extension.
4.  **Add Load on Startup Logic:**
    *   Create a `loadFromLocalStorage()` function to:
        *   Get the item `'generatedImages'` from `localStorage`.
        *   Parse the JSON string.
        *   Validate the parsed data (check if it's an array).
        *   Call `displayResults` with the loaded data if valid.
        *   Include error handling for parsing failures (e.g., clear corrupted data).
    *   Call `loadFromLocalStorage()` when the page script loads.

## Phase 3: Documentation (`README.md`)

1.  Update the "How It Works" section to describe the client-side storage mechanism using `localStorage`.
2.  Update the "Technologies Used" section to include "Browser Local Storage".
3.  Update the API Endpoint description for `/api/generate` to reflect the response format change (array of image data objects).

## Diagram of Planned Flow

```mermaid
sequenceDiagram
    participant User
    participant FE as Frontend (index.html)
    participant LS as Local Storage
    participant BE as Backend (index.ts)
    participant G as Gemini API

    User->>FE: Selects Image, Enters Prompt
    FE->>FE: Displays Preview (Data URL)
    User->>FE: Clicks Generate
    FE->>FE: Shows Loading
    FE->>BE: POST /api/generate (FormData with image file)
    BE->>BE: Parse image (multer memory storage)
    BE->>BE: Start N parallel generateImage calls
    loop N times
        BE->>G: ai.models.generateContent(...)
        G-->>BE: Response (base64 image data)
        BE->>BE: Extract {mimeType, data}
    end
    BE->>FE: Response { images: [{mimeType, data}, ...] }
    FE->>FE: Hides Loading
    FE->>LS: localStorage.setItem('generatedImages', JSON.stringify(images))
    FE->>FE: displayResults(images)
    FE->>FE: Render images using Data URLs
    User->>FE: Clicks Download on an image
    FE->>FE: downloadImage(mimeType, data)
    FE->>User: Triggers download via Data URL

    Note over FE, LS: On Page Load
    FE->>LS: localStorage.getItem('generatedImages')
    LS-->>FE: Returns stored JSON string (if exists)
    FE->>FE: Parses JSON
    FE->>FE: displayResults(parsedImages)