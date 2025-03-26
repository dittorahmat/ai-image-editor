const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
  } = require("@google/generative-ai");
  const { GoogleAIFileManager } = require("@google/generative-ai/server");
  const fs = require("node:fs");
  const mime = require("mime-types");
  
  const apiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const fileManager = new GoogleAIFileManager(apiKey);
  
  /**
   * Uploads the given file to Gemini.
   *
   * See https://ai.google.dev/gemini-api/docs/prompting_with_media
   */
  async function uploadToGemini(path, mimeType) {
    const uploadResult = await fileManager.uploadFile(path, {
      mimeType,
      displayName: path,
    });
    const file = uploadResult.file;
    console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
    return file;
  }
  
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp-image-generation",
  });
  
  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseModalities: [
      "image",
      "text",
    ],
    responseMimeType: "text/plain",
  };
  
  async function run() {
    // TODO Make these files available on the local file system
    // You may need to update the file paths
    const files = [
      await uploadToGemini("image (1).png", "image/png"),
    ];
  
    // TODO: Following code needs to be updated for client-side apps.
    const inlineFiles = [];
    try {
      let filename = '';
      filename = 'input_0';
      fs.writeFileSync(filename, Buffer.from("*insert_base64_image_here*", 'base64'));
      console.log(`Input written to: ${filename}`);
      inlineFiles.push(await uploadToGemini(filename, "image/png"));
    } catch (err) {
      console.error(err);
    }
  
    const chatSession = model.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                mimeType: files[0].mimeType,
                fileUri: files[0].uri,
              },
            },
            {text: "turn my character into a studio ghibli character "},
          ],
        },
        {
          role: "model",
          parts: [
            {
              fileData: {
                mimeType: inlineFiles[0].mimeType,
                fileUri: inlineFiles[0].uri,
              },
            },
          ],
        },
      ],
    });
  
    const result = await chatSession.sendMessage("INSERT_INPUT_HERE");
    // TODO: Following code needs to be updated for client-side apps.
    const candidates = result.response.candidates;
    for(let candidate_index = 0; candidate_index < candidates.length; candidate_index++) {
      for(let part_index = 0; part_index < candidates[candidate_index].content.parts.length; part_index++) {
        const part = candidates[candidate_index].content.parts[part_index];
        if(part.inlineData) {
          try {
            const filename = `output_${candidate_index}_${part_index}.${mime.extension(part.inlineData.mimeType)}`;
            fs.writeFileSync(filename, Buffer.from(part.inlineData.data, 'base64'));
            console.log(`Output written to: ${filename}`);
          } catch (err) {
            console.error(err);
          }
        }
      }
    }
    console.log(result.response.text());
  }
  
  run();