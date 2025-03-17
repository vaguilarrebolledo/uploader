"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { generatePresignedUrl } from "@/app/actions/s3-actions"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileType } from "lucide-react"
import { useRouter } from "next/navigation"

export function FileUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      // Get a pre-signed URL for uploading
      const response = await generatePresignedUrl(file.name, file.type)

      if (!response.success || !response.url) {
        throw new Error(response.error || "Failed to generate upload URL")
      }

      // Upload the file using the pre-signed URL
      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100
          setProgress(percentComplete)
        }
      }

      // Handle completion
      xhr.onload = () => {
        if (xhr.status === 200) {
          toast({
            title: "Upload successful",
            description: "Your file has been uploaded to S3",
          })
          setFile(null)
          router.refresh()
        } else {
          throw new Error(`Upload failed with status: ${xhr.status}`)
        }
        setUploading(false)
      }

      // Handle errors
      xhr.onerror = () => {
        throw new Error("Network error occurred during upload")
      }

      // Open and send the request
      xhr.open("PUT", response.url)
      xhr.setRequestHeader("Content-Type", file.type)
      xhr.send(file)
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
      setUploading(false)
    }
  }

  const isImage = file?.type.startsWith("image/")
  const isVideo = file?.type.startsWith("video/")

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Files</CardTitle>
        <CardDescription>Upload images and videos to your S3 bucket</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                accept="image/*,video/*"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="rounded-full bg-primary/10 p-3">
                  {isImage ? (
                    <FileType className="h-6 w-6 text-primary" />
                  ) : isVideo ? (
                    <FileType className="h-6 w-6 text-primary" />
                  ) : (
                    <Upload className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="text-sm font-medium">{file ? file.name : "Click to select or drag and drop"}</div>
                <div className="text-xs text-gray-500">
                  {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Supports images and videos up to 100MB"}
                </div>
              </div>
            </div>
          </div>

          {file && (
            <div className="space-y-2">
              {isImage && (
                <div className="relative aspect-video rounded-md overflow-hidden bg-gray-100">
                  <img
                    src={URL.createObjectURL(file) || "/placeholder.svg"}
                    alt="Preview"
                    className="object-contain w-full h-full"
                  />
                </div>
              )}
              {isVideo && (
                <div className="relative aspect-video rounded-md overflow-hidden bg-gray-100">
                  <video src={URL.createObjectURL(file)} controls className="object-contain w-full h-full" />
                </div>
              )}
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-gray-500 text-right">{Math.round(progress)}%</div>
            </div>
          )}

          <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
            {uploading ? "Uploading..." : "Upload to S3"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

