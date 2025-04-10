import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import Base64 from 'base64-js';
import MarkdownIt from 'markdown-it';
import { maybeShowApiKeyBanner } from './gemini-api-banner';
import './style.css';

// --- Constants ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ORIGINAL_IMAGE_KEY = 'originalImageDataURL';
const EDITED_IMAGE_KEY = 'editedImageDataURL';
const UNDO_IMAGE_KEY = 'undoImageDataURL';

// --- DOM Elements ---
const form = document.querySelector('form#edit-form');
const promptInput = document.querySelector('input[name="prompt"]');
const output = document.querySelector('.output');
const originalImageEl = document.getElementById('original-image-display');
const editedImageEl = document.getElementById('edited-image-display');
const saveButton = document.getElementById('save-button');
const formatSelect = document.getElementById('format-select');
const imageUploadInput = document.getElementById('image-upload');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', initializeEditor);

// --- Functions ---

/**
 * Initializes the image editor state on page load.
 */
function initializeEditor() {
  if (!originalImageEl || !editedImageEl || !output || !imageUploadInput) {
    console.error("Required DOM elements not found.");
    const body = document.querySelector('body');
    if (body) body.innerText = "Error: Critical page elements are missing.";
    return;
  }

  output.textContent = 'Please upload an image to start editing.';
  originalImageEl.src = '';
  editedImageEl.src = '';
  localStorage.removeItem(ORIGINAL_IMAGE_KEY);
  localStorage.removeItem(EDITED_IMAGE_KEY);
  localStorage.removeItem(UNDO_IMAGE_KEY);
  console.log("Editor initialized, awaiting image upload.");

  imageUploadInput.addEventListener('change', handleFileUpload);
}

/**
 * Handles the file selection event from the upload input.
 */
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        console.log("No file selected.");
        return;
    }
    if (!file.type.startsWith('image/')) {
        output.textContent = 'Please select a valid image file (JPG, PNG, WEBP).';
        console.warn("Non-image file selected:", file.type);
        imageUploadInput.value = '';
        return;
    }
    console.log("File selected:", file.name, file.type);
    output.textContent = 'Loading image...';
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64dataUrl = reader.result;
        localStorage.setItem(ORIGINAL_IMAGE_KEY, base64dataUrl);
        localStorage.removeItem(EDITED_IMAGE_KEY);
        localStorage.removeItem(UNDO_IMAGE_KEY);
        originalImageEl.src = base64dataUrl;
        editedImageEl.src = base64dataUrl;
        output.textContent = 'Image loaded. Enter instructions to edit.';
        console.log("Image stored in localStorage and displayed.");
    };
    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        output.textContent = `Error loading file: ${error.message || 'Unknown error'}`;
        localStorage.removeItem(ORIGINAL_IMAGE_KEY);
        originalImageEl.src = '';
        editedImageEl.src = '';
    };
    reader.readAsDataURL(file);
}

/**
 * Updates the 'Edited Image' display based on localStorage.
 */
function updateEditedImageDisplay() {
  if (!editedImageEl) return;
  const editedDataUrl = localStorage.getItem(EDITED_IMAGE_KEY);
  const originalDataUrl = localStorage.getItem(ORIGINAL_IMAGE_KEY);
  if (originalDataUrl) {
      editedImageEl.src = editedDataUrl || originalDataUrl;
  } else {
      editedImageEl.src = '';
  }
}

/**
 * Handles the UNDO command.
 */
function handleUndo() {
    if (!localStorage.getItem(ORIGINAL_IMAGE_KEY)) {
        if (output) output.textContent = 'Please upload an image first.';
        return;
    }
    const undoDataUrl = localStorage.getItem(UNDO_IMAGE_KEY);
    const editedDataUrl = localStorage.getItem(EDITED_IMAGE_KEY);
    if (undoDataUrl) {
        localStorage.setItem(EDITED_IMAGE_KEY, undoDataUrl);
        if (editedDataUrl) {
            localStorage.setItem(UNDO_IMAGE_KEY, editedDataUrl);
        } else {
             localStorage.removeItem(UNDO_IMAGE_KEY);
        }
        updateEditedImageDisplay();
        if (output) output.textContent = 'Undo successful.';
        console.log("Undo: Swapped edited and undo images.");
    } else {
        if (output) output.textContent = 'Nothing to undo.';
        console.log("Undo: No image found in undo buffer.");
    }
     promptInput.value = '';
}

// --- API Key Check ---
if (!API_KEY) {
  maybeShowApiKeyBanner('');
  console.error('API key not found. Please set VITE_GEMINI_API_KEY in your .env file');
  if (output) output.textContent = 'API Key is missing. Image editing disabled.';
  if (form) {
      promptInput.disabled = true;
      form.querySelector('button[type="submit"]').disabled = true;
  }
  if (saveButton) saveButton.disabled = true;
  if (formatSelect) formatSelect.disabled = true;
} else {
  maybeShowApiKeyBanner(API_KEY);
}

// --- Event Listeners ---

// Form submission (for AI editing)
if (form) {
  form.onsubmit = async ev => {
    ev.preventDefault();
    const userPrompt = promptInput.value.trim();
    const originalDataUrl = localStorage.getItem(ORIGINAL_IMAGE_KEY);
    if (!originalDataUrl) {
        if (output) output.textContent = 'Please upload an image before editing.';
        return;
    }
    if (userPrompt.toUpperCase() === 'UNDO') {
        handleUndo();
        return;
    }
    if (!API_KEY) {
      if (output) output.textContent = 'Cannot proceed without API Key.';
      return;
    }
    if (!userPrompt) {
        if (output) output.textContent = 'Please enter editing instructions.';
        return;
    }

    if (output) output.textContent = 'Generating edit...';

    try {
      const currentEditedDataUrl = localStorage.getItem(EDITED_IMAGE_KEY);
      const imageToEditDataUrl = currentEditedDataUrl || originalDataUrl;
      const [header, base64Data] = imageToEditDataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)[1];

      // Prepare the request for Gemini API
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({
        // >>>>>>>>>>>> Using the specified model <<<<<<<<<<<<
        model: 'gemini-2.0-flash-exp-image-generation', // Updated model name
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          // Add other necessary safety settings if needed
        ],
      });

      const contents = [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Data } },
            { text: userPrompt },
          ],
        },
      ];

      // Call the API
      console.log("Sending request to Gemini model:", model.model);
      const result = await model.generateContent({ contents });
      const response = result.response;

      // Process IMAGE response
      if (response && response.candidates && response.candidates[0] &&
          response.candidates[0].content && response.candidates[0].content.parts &&
          response.candidates[0].content.parts[0] && response.candidates[0].content.parts[0].inline_data)
      {
          const imageData = response.candidates[0].content.parts[0].inline_data;
          const newMimeType = imageData.mime_type;
          const newBase64Data = imageData.data;
          const newImageDataUrl = `data:${newMimeType};base64,${newBase64Data}`;

          const stateBeforeEdit = localStorage.getItem(EDITED_IMAGE_KEY) || localStorage.getItem(ORIGINAL_IMAGE_KEY);
          if (stateBeforeEdit) {
             localStorage.setItem(UNDO_IMAGE_KEY, stateBeforeEdit);
             console.log("Stored previous state to UNDO buffer.");
          }

          localStorage.setItem(EDITED_IMAGE_KEY, newImageDataUrl);
          console.log("Stored new edited image.");

          updateEditedImageDisplay();
          if (output) output.textContent = 'Edit complete.';

      } else {
           console.error("API Response did not contain expected image data:", response);
           const textResponse = response?.candidates?.[0]?.content?.parts?.[0]?.text;
           if (textResponse) {
               let md = new MarkdownIt();
               if (output) output.innerHTML = "Model returned text instead of image:<br>" + md.render(textResponse);
           } else if (response?.promptFeedback?.blockReason) {
               if (output) output.textContent = `Edit blocked: ${response.promptFeedback.blockReason}`;
           } else {
               if (output) output.textContent = 'Edit failed: Could not process response.';
           }
      }

    } catch (e) {
      console.error("Error during image editing API call:", e);
      if (output) output.innerHTML = `<hr>Error: ${e.message || 'An unknown error occurred'}`;
    } finally {
        promptInput.value = '';
    }
  };
}

// Save button functionality
if (saveButton && formatSelect) {
    saveButton.onclick = () => {
        console.log("Save button clicked.");
        const imageDataUrl = localStorage.getItem(EDITED_IMAGE_KEY) || localStorage.getItem(ORIGINAL_IMAGE_KEY);
        if (!imageDataUrl) {
            if (output) output.textContent = 'Please upload and/or edit an image before saving.';
            return;
        }
        if (output) output.textContent = 'Preparing download...';
        try {
            const selectedFormat = formatSelect.value;
            const mimeType = `image/${selectedFormat === 'jpg' ? 'jpeg' : 'png'}`;
            const filename = `edited-image.${selectedFormat}`;
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (mimeType === 'image/jpeg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(img, 0, 0);
                const targetDataUrl = canvas.toDataURL(mimeType, mimeType === 'image/jpeg' ? 0.9 : undefined);
                const link = document.createElement('a');
                link.href = targetDataUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                console.log(`Image download triggered as ${filename}`);
                if (output) output.textContent = `Image saved as ${filename}.`;
            };
            img.onerror = (err) => {
                 console.error("Error loading image data URL for saving:", err);
                 throw new Error(`Could not load image data for saving. Error: ${err}`);
            };
            img.src = imageDataUrl;
        } catch (e) {
            console.error("Error preparing image for download:", e);
            if (output) output.textContent = `Save failed: ${e.message}`;
        }
    };
} else {
    console.warn("Save button or format select element not found.");
}
