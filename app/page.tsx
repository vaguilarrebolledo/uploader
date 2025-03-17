import { FileUploader } from "@/components/file-uploader"
import { FileList } from "@/components/file-list"

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">Amazon S3 File Uploader</h1>
      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
        <div>
          <FileUploader />
        </div>
        <div>
          <FileList />
        </div>
      </div>
    </div>
  )
}

