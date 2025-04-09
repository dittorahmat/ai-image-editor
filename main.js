import {GoogleGenerativeAI, HarmBlockThreshold, HarmCategory} from '@google/generative-ai'
import Base64 from 'base64-js'
import MarkdownIt from 'markdown-it'
import {maybeShowApiKeyBanner} from './gemini-api-banner'
import './style.css'

// Get the API key from environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  // If the API key is missing, show the banner from gemini-api-banner.js
  // You can delete the maybeShowApiKeyBanner call below and the gemini-api-banner.js file
  // once you have your API key set up.
  maybeShowApiKeyBanner(''); // Pass an empty string or handle appropriately
  console.error('API key not found. Please set VITE_GEMINI_API_KEY in your .env file');
  // Optionally, disable the form or show a message to the user
  // document.querySelector('form').style.display = 'none'; 
  // document.querySelector('.output').textContent = 'API Key is missing. Please configure it in the .env file.';
} else {
  // If the API key exists, potentially hide the banner if it was shown
  maybeShowApiKeyBanner(API_KEY); // Or simply don't call it if it should only show when key is missing
}

let form = document.querySelector('form')
let promptInput = document.querySelector('input[name="prompt"]')
let output = document.querySelector('.output')

form.onsubmit = async ev => {
  ev.preventDefault()

  if (!API_KEY) {
    output.textContent = 'Cannot proceed without API Key.';
    return; // Stop execution if API key is missing
  }

  output.textContent = 'Generating...'

  try {
    // Load the image as a base64 string
    let imageUrl = form.elements.namedItem('chosen-image').value
    let imageBase64 = await fetch(imageUrl)
      .then(r => r.arrayBuffer())
      .then(a => Base64.fromByteArray(new Uint8Array(a)))

    // Assemble the prompt by combining the text with the chosen image
    let contents = [
      {
        role: 'user',
        parts: [
          {inline_data: {mime_type: 'image/jpeg', data: imageBase64}},
          {text: promptInput.value},
        ],
      },
    ]

    // Call the multimodal model, and get a stream of results
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash', // or gemini-1.5-pro
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    })

    const result = await model.generateContentStream({contents})

    // Read from the stream and interpret the output as markdown
    let buffer = []
    let md = new MarkdownIt()
    for await (let response of result.stream) {
      buffer.push(response.text())
      output.innerHTML = md.render(buffer.join(''))
    }
  } catch (e) {
    output.innerHTML += '<hr>' + e
  }
}

// Call maybeShowApiKeyBanner conditionally based on API_KEY presence
// This logic is now handled at the top of the file.
// maybeShowApiKeyBanner(API_KEY); 
