import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

// This function will handle the request from your Webflow page.
export default async function handler(req, res) {
  // Set CORS headers to allow requests from your Webflow domain
  res.setHeader('Access-Control-Allow-Origin', 'https://www.send-files.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, tus-resumable, tus-version, tus-max-size, tus-extension, Upload-Offset, Upload-Length');

  // Handle the OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Uppy sends a POST request with the file details in the body
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const file = req.body;

  if (!file || !file.name || !file.type) {
    return res.status(400).json({ error: 'File details are required' });
  }

  // Use the environment variables from your Vercel settings.
  const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
  const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
  const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;
  const B2_ENDPOINT = process.env.B2_ENDPOINT;

  // Configure the S3 client for Backblaze B2.
  const client = new S3Client({
    region: "us-east-1", // Any region will work, B2 ignores it.
    endpoint: B2_ENDPOINT,
    credentials: {
      accessKeyId: B2_APPLICATION_KEY_ID,
      secretAccessKey: B2_APPLICATION_KEY,
    },
  });

  // Here we set the full path for the file. 
  // Make sure to include the file name to avoid overwriting files.
  const key = `user-uploads/${file.name}`;

  try {
    // This function creates the pre-signed POST data with all the required fields.
    const { url, fields } = await createPresignedPost(client, {
      Bucket: B2_BUCKET_NAME,
      Key: key,
      Expires: 3600, // Credentials expire in 1 hour
      Fields: {
        'Content-Type': file.type,
      },
    });

    // Uppy expects both the URL and the fields object in the response.
    return res.status(200).json({ url, fields });

  } catch (error) {
    console.error("Error generating signed URL:", error);
    return res.status(500).json({ error: "Failed to get upload URL" });
  }
}