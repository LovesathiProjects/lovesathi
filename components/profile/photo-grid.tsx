"use client"

import { useState } from "react"
import { Camera, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getProfileFallbackImage } from "@/lib/profileImages"
import { cn } from "@/lib/utils"

interface Photo {
  id: string
  url: string
  isMain?: boolean
}

export function PhotoGrid() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const maxPhotos = 6

  const handleAddPhoto = () => {
    if (photos.length >= maxPhotos) return

    const id = Date.now().toString()
    const newPhoto: Photo = {
      id,
      url: getProfileFallbackImage("New profile photo", id),
      isMain: photos.length === 0,
    }
    setPhotos((prev) => [...prev, newPhoto])
  }

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => {
      const next = prev.filter((photo) => photo.id !== id)
      if (!next.some((photo) => photo.isMain) && next[0]) {
        next[0] = { ...next[0], isMain: true }
      }
      return next
    })
  }

  const handleSetMainPhoto = (id: string) => {
    setPhotos((prev) =>
      prev.map((photo) => ({
        ...photo,
        isMain: photo.id === id,
      })),
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo, index) => (
          <div key={photo.id} className="group relative">
            <Card
              className={cn(
                "aspect-square overflow-hidden rounded-lg border-2 transition-colors",
                photo.isMain ? "border-[#E83262]" : "border-border",
              )}
            >
              <img
                src={photo.url}
                alt={`Profile photo ${index + 1}`}
                className="h-full w-full object-cover"
              />

              {photo.isMain && (
                <div className="absolute left-2 top-2 rounded-md bg-[#E83262] px-2 py-1 text-xs font-bold text-white">
                  Main
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[#26364A]/55 opacity-0 transition-opacity group-hover:opacity-100">
                {!photo.isMain && (
                  <Button size="sm" variant="secondary" onClick={() => handleSetMainPhoto(photo.id)} className="text-xs">
                    Set Main
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => handleRemovePhoto(photo.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <Card
            className="aspect-square cursor-pointer rounded-lg border-2 border-dashed border-muted-foreground/25 transition-colors hover:border-[#E83262]/50"
            onClick={handleAddPhoto}
          >
            <div className="flex h-full w-full flex-col items-center justify-center space-y-2 text-muted-foreground transition-colors hover:text-[#E83262]">
              <Plus className="h-8 w-8" />
              <span className="text-xs font-medium">Add Photo</span>
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Photos ({photos.length}/{maxPhotos})
          </span>
          <Button variant="outline" size="sm" className="bg-transparent text-xs">
            <Camera className="mr-1 h-3 w-3" />
            Take Photo
          </Button>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p>- Drag photos to reorder them</p>
          <p>- Your main photo will be shown first</p>
          <p>- Use high-quality, recent photos for best results</p>
        </div>
      </div>
    </div>
  )
}
