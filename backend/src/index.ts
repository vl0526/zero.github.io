import express from 'express';
import {enqueueJob} from './queue';
import {getSecret} from './secrets';
import cors from 'cors';

// Initialize Express app
const app=express();
// Use CORS middleware to allow cross-origin requests (for frontend development)
app.use(cors());
// Use express.json middleware to parse JSON request bodies, with a limit for file uploads
app.use(express.json({limit:'50mb'}));

// Store Server-Sent Event emitters keyed by jobId
// This allows the backend to send progress updates and results back to the correct client connection.
const emitters=new Map<string, Function>(); // Use a single function per jobId for simplicity here

// SSE endpoint to stream progress and results
app.get('/stream/:jobId',(req,res)=>{
  // Set headers for Server-Sent Events
  res.writeHead(200,{
    'Content-Type':'text/event-stream',
    'Cache-Control':'no-cache',
    'Connection':'keep-alive',
  });

  const id=req.params.jobId;

  // Function to send an SSE event
  const send=(event:string,data:any)=>res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  // Store the send function for this jobId
  emitters.set(id, send);

  // Handle client disconnect
  req.on('close', () => {
    console.log(`Client disconnected for jobId: ${id}`);
    emitters.delete(id); // Clean up the emitter when the client disconnects
  });

  console.log(`SSE connection established for jobId: ${id}`);
});

// Endpoint to create a new subtitle generation job
app.post('/generate',async(req,res)=>{
  const {file}=req.body; // Base64 file data from frontend
  if (!file) {
    return res.status(400).json({ error: 'No file data provided.' });
  }

  try {
    // Retrieve Gemini API key from Secret Manager
    // NOTE: Replace 'projects/..../secrets/GEMINI_API_KEY/versions/latest' with your actual secret path.
    const key=await getSecret('projects/YOUR_PROJECT_ID/secrets/GEMINI_API_KEY/versions/latest');
    if (!key) {
       throw new Error('Gemini API key not found.');
    }

    // Enqueue the job to Pub/Sub, including the file data and API key
    // The Pub/Sub message ID will be used as the jobId
    const jobId=await enqueueJob({file,apiKey:key});

    console.log(`Job enqueued with ID: ${jobId}`);

    // Send the jobId back to the frontend
    res.json({jobId});

  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job.' });
  }
});

// Simple endpoint to check if the API is running
app.get('/health', (req, res) => {
  res.status(200).send('API is healthy');
});


// Function to notify the frontend via SSE (to be called by the worker)
// This function needs to be accessible by the worker or the worker needs
// a mechanism to communicate back to the API instance handling the SSE connection.
// A common pattern is for the worker to publish a message to another Pub/Sub topic
// which the API instance subscribes to.
export function notifyFrontend(jobId: string, event: string, data: any) {
  const send = emitters.get(jobId);
  if (send) {
    send(event, data);
    console.log(`Sent SSE event "${event}" for jobId: ${jobId}`);
  } else {
    console.warn(`No SSE emitter found for jobId: ${jobId}`);
  }
}


// Start the Express server
const PORT = process.env.PORT || 8080; // Use PORT environment variable for Cloud Run
app.listen(PORT,()=>console.log(`API listening on port ${PORT}`));

// NOTE: The worker.ts needs a way to call notifyFrontend in this API instance.
// A robust solution involves a separate Pub/Sub topic for results/progress
// where the worker publishes updates, and this API instance subscribes to that topic
// to forward messages via SSE. The current setup assumes direct access, which is not
// feasible in a distributed environment like Cloud Run with multiple instances.
