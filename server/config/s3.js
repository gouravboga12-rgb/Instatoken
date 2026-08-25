const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'instatoken-media-prod';

/**
 * Generate a pre-signed URL for direct client-side upload
 * @param {string} key - S3 object key (e.g. 'doctors/doc-123.jpg')
 * @param {string} contentType - MIME type (e.g. 'image/jpeg')
 * @param {number} expiresIn - Expiry in seconds (default 300 = 5 mins)
 */
async function generateUploadUrl(key, contentType, expiresIn = 300) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-2'}.amazonaws.com/${key}`;

  return {
    uploadUrl,
    publicUrl,
    key,
  };
}

/**
 * Upload a buffer or string directly to S3 from server
 * @param {string} key - S3 object key
 * @param {Buffer|string} body - File content
 * @param {string} contentType - MIME type
 */
async function uploadFile(key, body, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-2'}.amazonaws.com/${key}`;
}

/**
 * Delete an object from S3
 * @param {string} key - S3 object key
 */
async function deleteFile(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
  return true;
}

module.exports = {
  s3Client,
  BUCKET_NAME,
  generateUploadUrl,
  uploadFile,
  deleteFile,
};
