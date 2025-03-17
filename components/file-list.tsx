"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { listFiles, deleteFile } from "@/app/actions/s3-actions"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Image, FileVideo, RefreshCw, FileIcon } from "lucide-react"
import { useRouter } from "next/navigation"

type FileItem = {
  key: string
  fileName: string
  category: string
  lastModified?: Date
  size?: number
  url: string
}

export function FileList() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const response = await listFiles()
      if (response.success) {
        setFiles(response.files)
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to load files",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching files:", error)
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  
  useEffect(() => {
    fetchFiles()
  }, [])

  const handleDelete = async (key: string) => {
    setDeleting(key)
    try {
      const response = await deleteFile(key)
      if (response.success) {
        toast({
          title: "Success",
          description: "File deleted successfully",
        })
        setFiles(files.filter((file) => file.key !== key))
        router.refresh()
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to delete file",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting file:", error)
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const formatDate = (date?: Date) => {
    if (!date) return "Unknown date"
    return new Date(date).toLocaleString()
  }

  const imageFiles = files.filter((file) => file.category === "images")
  const videoFiles = files.filter((file) => file.category === "videos")
  const otherFiles = files.filter((file) => file.category === "other")

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Your Files</CardTitle>
          <CardDescription>Manage your uploaded files</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={fetchFiles} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="images">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="images">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                <span>Images ({imageFiles.length})</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="videos">
              <div className="flex items-center gap-2">
                <FileVideo className="h-4 w-4" />
                <span>Videos ({videoFiles.length})</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="all">
              <div className="flex items-center gap-2">
                <FileIcon className="h-4 w-4" />
                <span>All ({files.length})</span>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="images" className="mt-4">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : imageFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No images uploaded yet</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {imageFiles.map((file) => (
                  <div key={file.key} className="group relative">
                    <div className="aspect-square rounded-md overflow-hidden bg-gray-100">
                      {/* Usar el componente Image de Next.js con crossOrigin */}
                      <img
                        src={file.url || "/placeholder.svg"}
                        alt={file.fileName}
                        className="object-cover w-full h-full"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          // Mostrar un mensaje de error si la imagen no se puede cargar
                          console.error("Error loading image:", file.url)
                          // Establecer una imagen de respaldo
                          e.currentTarget.src = "/placeholder.svg?height=200&width=200"
                        }}
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-2">
                        <Button variant="secondary" size="icon" onClick={() => window.open(file.url, "_blank")}>
                          <Image className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(file.key)}
                          disabled={deleting === file.key}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-1 text-xs truncate">{file.fileName}</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="videos" className="mt-4">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : videoFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No videos uploaded yet</div>
            ) : (
              <div className="space-y-4">
                {videoFiles.map((file) => (
                  <div key={file.key} className="border rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{file.fileName}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {formatDate(file.lastModified)}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(file.key)}
                        disabled={deleting === file.key}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="aspect-video rounded-md overflow-hidden bg-gray-100">
                      <video src={file.url} controls className="object-contain w-full h-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No files uploaded yet</div>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div key={file.key} className="flex items-center justify-between border rounded-md p-3">
                    <div className="flex items-center gap-3">
                      {file.category === "images" ? (
                        <Image className="h-5 w-5 text-blue-500" />
                      ) : file.category === "videos" ? (
                        <FileVideo className="h-5 w-5 text-purple-500" />
                      ) : (
                        <FileIcon className="h-5 w-5 text-gray-500" />
                      )}
                      <div>
                        <div className="font-medium truncate max-w-[200px]">{file.fileName}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {formatDate(file.lastModified)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => window.open(file.url, "_blank")}>
                        View
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(file.key)}
                        disabled={deleting === file.key}
                      >
                        {deleting === file.key ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

