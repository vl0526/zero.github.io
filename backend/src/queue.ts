import {PubSub} from '@google-cloud/pubsub';

// Initialize Pub/Sub client
const pubsub=new PubSub();

// Define topic and subscription names
const TOPIC='subtitle-jobs';
const SUB='subtitle-workers';

/**
 * Enqueues a job message to the Pub/Sub topic.
 * @param data - The job data to be sent.
 * @returns The message ID (which can serve as a jobId).
 */
export async function enqueueJob(data:any){
  const message=Buffer.from(JSON.stringify(data));
  const res=await pubsub.topic(TOPIC).publish(message);
  return res; // messageId as jobId
}

/**
 * Subscribes to the Pub/Sub subscription and handles incoming messages.
 * @param handler - A function to process the incoming job data.
 */
export function subscribe(handler:(data:any)=>void){
  const sub=pubsub.subscription(SUB);
  // Listen for messages
  sub.on('message',msg=>{
    try {
      // Parse message data and call the handler
      const jobData = JSON.parse(msg.data.toString());
      handler(jobData);
      // Acknowledge the message after processing
      msg.ack();
    } catch (error) {
      console.error('Error processing Pub/Sub message:', error);
      // Optionally, handle errors (e.g., nack the message for redelivery)
      // msg.nack();
    }
  });

  // Add error handling for the subscription
  sub.on('error', error => {
    console.error('Error from Pub/Sub subscription:', error);
    // The subscriber will be restarted automatically by the client library
  });
}
