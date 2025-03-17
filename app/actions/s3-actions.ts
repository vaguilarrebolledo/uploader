"use server"

import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { revalidatePath } from "next/cache"
import * as crypto from "crypto"

// Initialize the S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
})

const bucketName = process.env.AWS_BUCKET_NAME

// Generate a unique file name to avoid overwriting
function generateUniqueFileName(originalName: string) {
  const timestamp = Date.now()
  const randomString = crypto.randomBytes(8).toString("hex")
  const extension = originalName.split(".").pop()
  return `${timestamp}-${randomString}.${extension}`
}

// Get file type category (image or video)
function getFileTypeCategory(contentType: string) {
  if (contentType.startsWith("image/")) return "images"
  if (contentType.startsWith("video/")) return "videos"
  return "other"
}

// Generate a pre-signed URL for uploading a file
export async function generatePresignedUrl(fileName: string, contentType: string) {
  try {
    const fileCategory = getFileTypeCategory(contentType)
    const uniqueFileName = `${fileCategory}/${generateUniqueFileName(fileName)}`

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      ContentType: contentType,
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return {
      success: true,
      url: signedUrl,
      key: uniqueFileName,
    }
  } catch (error) {
    console.error("Error generating pre-signed URL:", error)
    return {
      success: false,
      error: "Failed to generate upload URL",
    }
  }
}

// List all files in the bucket
export async function listFiles() {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
    })

    const response = await s3Client.send(command)

    // Función para generar URL firmada
    const generateSignedUrl = async (key: any) => {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      return await getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15 minutos de validez
    };

    const files = await Promise.all(
      (response.Contents || []).map(async (item) => {
        const key = item.Key || "";
        const category = key.split("/")[0];
        const fileName = key.split("/").pop() || "";
        const lastModified = item.LastModified;
        const size = item.Size;

        // Genera URL firmada para cada archivo
        const signedUrl = await generateSignedUrl(key);

        return {
          key,
          fileName,
          category,
          lastModified,
          size,
          url: signedUrl, // Ahora es una URL temporal
        };
      })
    );

    return {
      success: true,
      files,
    }
  } catch (error) {
    console.error("Error listing files:", error)
    return {
      success: false,
      error: "Failed to list files",
      files: [],
    }
  }
}

// Delete a file from the bucket
export async function deleteFile(key: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    await s3Client.send(command)
    revalidatePath("/")

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error deleting file:", error)
    return {
      success: false,
      error: "Failed to delete file",
    }
  }
}

