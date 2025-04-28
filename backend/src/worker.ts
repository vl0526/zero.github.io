import {subscribe} from './queue';
import {TextToTextClient} from '@google/genai'; // Assuming @google/genai provides a client for Gemini
import {getSecret} from './secrets'; // Although apiKey is passed in job data, keeping getSecret might be useful
import {Storage} from '@google-cloud/storage';
// Import the notification function from the API index.ts
// NOTE: In a real distributed system (like Cloud Run), the worker cannot directly
// call a function in the API instance. You'd use a separate Pub/Sub topic
// for the worker to publish results/progress, and the API instance would subscribe
// to that topic to forward the messages via SSE.
// For this example structure, we'll simulate direct access for simplicity,
// but be aware this needs refactoring for production Cloud Run.
// import { notifyFrontend } from './index'; // This import won't work across instances

const storage=new Storage();

// NOTE: Replace 'subtitle-results' with your actual GCS bucket name
const BUCKET='subtitle-results';

// Define the system instruction for the Gemini model
const SYSTEM_INSTRUCTION = `You are an AI assistant that generates SRT subtitle files from audio/video content.
Your output must be in the standard SRT format.
Each subtitle block should include:
1. A sequential number.
2. The start and end timecodes in the format HH:MM:SS,ms --> HH:MM:SS,ms.
3. The subtitle text.
Ensure accurate timing and clear segmentation of dialogue.
Provide the complete SRT content as plain text.`;


// Subscribe to the job queue
subscribe(async job=>{
  console.log(`Worker received job: ${job.jobId}`); // Assuming job data includes jobId

  try {
    // Initialize Gemini client with the API key from the job data
    const client=new TextToTextClient({apiKey:job.apiKey});

    // --- Subtitle Generation Logic ---
    // NOTE: The provided code has a placeholder for chunking and the actual
    // Gemini API call using 'media'. The @google/genai library might require
    // a different approach for large audio/video files (e.g., uploading to GCS
    // and providing a URI, or using a specific model endpoint for transcription).
    // The current TextToTextClient might not directly support base64 media input
    // for transcription. You might need to use a different client or API.
    // This is a critical part that needs implementation based on the actual
    // Gemini API capabilities for audio/video transcription.

    // Simulate progress updates (replace with actual progress from transcription process)
    // NOTE: In a distributed system, these updates would be published to a Pub/Sub topic
    // for the API instance to consume and forward via SSE.
    // notifyFrontend(job.jobId, 'progress', { percent: 10 });
    // notifyFrontend(job.jobId, 'progress', { percent: 50 });
    // notifyFrontend(job.jobId, 'progress', { percent: 90 });


    // Placeholder for the actual Gemini API call for transcription
    // This part needs significant implementation based on the chosen API/model.
    // Example placeholder using the provided structure (may not work directly):
    console.log("Calling Gemini API...");
    // The 'media' field with base64 data might not be supported directly by TextToTextClient.
    // You might need to use a different client or upload the file to GCS first.
    const response = await client.generate({
      model: 'gemini-2.5-pro-preview-03-25', // Or a suitable model for transcription
      prompt: SYSTEM_INSTRUCTION,
      // The 'media' field might need a different structure or approach
      // depending on the actual API used for audio/video transcription.
      // This is a placeholder and likely needs adjustment.
      // For large files, consider uploading to GCS and providing a URI.
      media: job.file, // Assuming job.file contains the base64 data URL
      mimeType: 'text/plain' // Adjust mimeType based on actual media type if needed
    });
     console.log("Gemini API call finished.");

    // Extract the generated SRT text from the response
    const srt = response.text;

    if (!srt) {
        throw new Error('Gemini API did not return subtitle text.');
    }

    // --- Save SRT to Google Cloud Storage ---
    const file=storage.bucket(BUCKET).file(`${job.jobId}.srt`); // Use jobId for filename
    await file.save(srt,{contentType:'text/plain'});
    console.log(`SRT saved to gs://${BUCKET}/${job.jobId}.srt`);

    // --- Notify Frontend (Simulated) ---
    // NOTE: Replace with actual Pub/Sub publish to a results topic
    // for the API instance to consume.
    // notifyFrontend(job.jobId, 'done', { srt });
    console.log(`Worker finished job: ${job.jobId}. Result ready.`);

    // In a real system, publish a message to a 'results' topic:
    // await pubsub.topic('subtitle-results').publish(Buffer.from(JSON.stringify({ jobId: job.jobId, srt })));


  } catch (error) {
    console.error(`Error processing job ${job.jobId}:`, error);
    // --- Notify Frontend of Error (Simulated) ---
    // NOTE: Replace with actual Pub/Sub publish to a results topic
    // notifyFrontend(job.jobId, 'error', { message: 'Failed to generate subtitles.' });
    // In a real system, publish an error message to a 'results' topic:
    // await pubsub.topic('subtitle-results').publish(Buffer.from(JSON.stringify({ jobId: job.jobId, error: 'Failed to generate subtitles.' })));
  }
});

console.log('Subtitle worker started, listening for messages...');

// NOTE ON GEMINI API FOR AUDIO/VIDEO:
// The `@google/genai` library and the `TextToTextClient` are primarily for text-based models.
// To transcribe audio/video, you would typically use a dedicated speech-to-text API
// (like Google Cloud Speech-to-Text) or a multimodal model endpoint that specifically
// handles audio/video input for transcription.
// The current implementation using `client.generate({ media: job.file })` with `gemini-2.5-pro-preview-03-25`
// and `TextToTextClient` is a placeholder based on the user's provided structure but
// is unlikely to work directly for audio/video transcription with this specific client/model.
// You will need to integrate with the correct API for this functionality.
// A common pattern is:
// 1. Frontend uploads file to GCS.
// 2. Frontend sends GCS URI to backend API.
// 3. Backend API enqueues job with GCS URI.
// 4. Worker downloads file from GCS (or uses GCS URI with transcription API).
// 5. Worker calls the appropriate transcription API (e.g., Cloud Speech-to-Text, or a multimodal Gemini endpoint designed for this).
// 6. Worker saves SRT to GCS.
// 7. Worker publishes result/progress to a Pub/Sub topic.
// 8. Backend API subscribes to results topic and forwards to frontend via SSE.
