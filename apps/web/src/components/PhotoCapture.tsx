import { useRef, useState, useCallback } from "react";

export interface CapturedPhoto {
  file: File;
  base64: string;
  previewUrl: string;
}

interface PhotoCaptureProps {
  onPhotosChange: (photos: CapturedPhoto[]) => void;
  maxPhotos?: number;
  compact?: boolean;
  disabled?: boolean;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function PhotoCapture({ onPhotosChange, maxPhotos = 5, compact = false, disabled = false }: PhotoCaptureProps) {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const slots = maxPhotos - photos.length;
    if (slots <= 0) { setError(`Maximum ${maxPhotos} photos allowed`); return; }
    const incoming = Array.from(files).slice(0, slots);
    for (const file of incoming) {
      if (!file.type.startsWith("image/")) { setError("Only image files are allowed"); return; }
      if (file.size > MAX_FILE_BYTES) { setError(`"${file.name}" exceeds the 5 MB limit`); return; }
    }
    const newCaptured: CapturedPhoto[] = await Promise.all(
      incoming.map(async (file) => ({ file, base64: await fileToBase64(file), previewUrl: URL.createObjectURL(file) }))
    );
    const updated = [...photos, ...newCaptured].slice(0, maxPhotos);
    setPhotos(updated);
    onPhotosChange(updated);
    if (inputRef.current) inputRef.current.value = "";
  }, [photos, maxPhotos, onPhotosChange]);

  const removePhoto = useCallback((index: number) => {
    const removed = photos[index];
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
    onPhotosChange(updated);
  }, [photos, onPhotosChange]);

  const atLimit = photos.length >= maxPhotos;

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <div className="relative">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || atLimit} title={atLimit ? `Maximum ${maxPhotos} photos reached` : "Add site photo"} className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gray5)] text-[var(--gray1)] transition-all hover:bg-[var(--gray4)] active:scale-90 disabled:cursor-not-allowed disabled:opacity-40">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--gray1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          {photos.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[9px] font-bold text-white leading-none">{photos.length}</span>
          )}
        </div>
        {error && <p className="max-w-[200px] text-center text-[10px] text-[var(--red)]">{error}</p>}
        {photos.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {photos.map((photo, i) => (
              <div key={photo.previewUrl} className="relative h-12 w-12 overflow-hidden rounded-lg border border-[var(--sep)]">
                <img src={photo.previewUrl} alt={`Site photo ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => removePhoto(i)} className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                  <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || atLimit} className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--sep)] bg-[var(--bg)] px-6 py-8 transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 disabled:cursor-not-allowed disabled:opacity-50">
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--gray2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
        </svg>
        <p className="text-[13px] font-medium">{atLimit ? `Maximum ${maxPhotos} photos reached` : "Add site photos"}</p>
        <p className="text-[10px] text-[var(--tertiary)]">{photos.length}/{maxPhotos} photos · Max 5 MB each</p>
      </button>
      {error && <p className="text-[12px] text-[var(--red)]">{error}</p>}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {photos.map((photo, i) => (
            <div key={photo.previewUrl} className="relative aspect-square overflow-hidden rounded-xl border border-[var(--sep)]">
              <img src={photo.previewUrl} alt={`Site photo ${i + 1}`} className="h-full w-full object-cover" />
              <button type="button" onClick={() => removePhoto(i)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
