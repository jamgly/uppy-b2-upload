// A simple Node.js backend using the official AWS SDK for S3-compatible storage.
// Vercel or Netlify will run this code as a function.

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// This function will handle the request from your Webflow page.
export default async function handler(req, res) {
  // We'll get the file name from the request made by Uppy.
  // The 'file' variable will be the object Uppy sends us.
  const file = req.body;

  if (!file || !file.name) {
    return res.status(400).json({ error: "File name is required" });
  }

  // Use the environment variables we set in Vercel.
  const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
  const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
  const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;
  const B2_ENDPOINT = process.env.B2_ENDPOINT;

  // Configure the S3 client to talk to Backblaze.
  const client = new S3Client({
    region: "us-east-1", // You can use any region, B2 ignores it.
    endpoint: B2_ENDPOINT,
    credentials: {
      accessKeyId: B2_APPLICATION_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
    },
  });

  // Here we set the full path for the file. 
  // You can customize this to include the user's name or a unique ID.
  const key = `user-uploads/${file.name}`;

  // Create a command to put the object into the bucket.
  const command = new PutObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
    ContentType: file.type,
  });

  try {
    // This is the magic part: we generate a secure, temporary URL.
    const url = await getSignedUrl(client, command, { expiresIn: 3600 }); // Expires in 1 hour

    // Send the URL back to Uppy on the frontend.
    return res.status(200).json({ url: url });

  } catch (error) {
    console.error("Error generating signed URL:", error);
    return res.status(500).json({ error: "Failed to get upload URL" });
  }
}