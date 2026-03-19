import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Badge, Modal, Field, inputClass, textareaClass, selectClass, EmptyState } from "@proestimate/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobPhoto {
  id: string;
  estimate_id: string;
  phase_id: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string;
  category: string;
  caption: string | null;
  tags: string[];
  room: string | null;
  taken_at: string;
  taken_by_name: string | null;
  created_at: string;
}

type PhotoCategory = "all" | "before" | "during" | "after" | "issue" | "progress" | "material" | "inspection";

const CATEGORIES: { id: PhotoCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "before", label: "Before" },
  { id: "during", label: "During" },
  { id: "after", label: "After" },
  { id: "issue", label: "Issue" },
  { id: "progress", label: "Progress" },
  { id: "material", label: "Material" },
  { id: "inspection", label: "Inspection" },
];

const UPLOAD_CATEGORIES = CATEGORIES.filter((c) => c.id !== "all");

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  before: { bg: "bg-sky-50 ring-sky-200", text: "text-sky-700" },
  during: { bg: "bg-amber-50 ring-amber-200", text: "text-amber-700" },
  after: { bg: "bg-emerald-50 ring-emerald-200", text: "text-emerald-700" },
  issue: { bg: "bg-red-50 ring-red-200", text: "text-red-700" },
  progress: { bg: "bg-neutral-100 ring-neutral-200", text: "text-neutral-600" },
  material: { bg: "bg-violet-50 ring-violet-200", text: "text-violet-700" },
  inspection: { bg: "bg-teal-50 ring-teal-200", text: "text-teal-700" },
  safety: { bg: "bg-orange-50 ring-orange-200", text: "text-orange-700" },
  other: { bg: "bg-neutral-100 ring-neutral-200", text: "text-neutral-600" },
};

function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other!;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${colors.bg} ${colors.text}`}>
      {category}
    </span>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getStorageUrl(path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${supabaseUrl}/storage/v1/object/public/${path}`;
}

// ---------------------------------------------------------------------------
// Photo Log Component
// ---------------------------------------------------------------------------

interface PhotoLogProps {
  estimateId: string;
}

export function PhotoLog({ estimateId }: PhotoLogProps) {
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<PhotoCategory>("all");
  const [view, setView] = useState<"gallery" | "timeline">("gallery");
  const [lightboxPhoto, setLightboxPhoto] = useState<JobPhoto | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const fetchPhotos = useCallback(async () => {
    if (!estimateId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/job-photos?estimateId=${estimateId}`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos ?? []);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [estimateId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return photos;
    return photos.filter((p) => p.category === activeCategory);
  }, [photos, activeCategory]);

  // Group by day for timeline view
  const grouped = useMemo(() => {
    const map = new Map<string, JobPhoto[]>();
    for (const photo of filtered) {
      const day = photo.taken_at.slice(0, 10);
      const arr = map.get(day) ?? [];
      arr.push(photo);
      map.set(day, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  if (!estimateId) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-[13px] text-[var(--secondary)]">No estimate selected. Use ?estimateId= to load photos.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-[var(--sep)] px-4 pb-3 pt-4 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--label)]">Photo Log</h2>
            <p className="text-[11px] text-[var(--secondary)]">{photos.length} photo{photos.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-lg bg-[var(--fill)] p-0.5">
              <button
                onClick={() => setView("gallery")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  view === "gallery" ? "bg-[var(--card)] text-[var(--label)] shadow-sm" : "text-[var(--secondary)] hover:text-[var(--label)]"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setView("timeline")}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  view === "timeline" ? "bg-[var(--card)] text-[var(--label)] shadow-sm" : "text-[var(--secondary)] hover:text-[var(--label)]"
                }`}
              >
                Timeline
              </button>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-medium text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Upload
            </button>
          </div>
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {CATEGORIES.map((cat) => {
            const count = cat.id === "all" ? photos.length : photos.filter((p) => p.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  activeCategory === cat.id
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--fill)] text-[var(--secondary)] hover:text-[var(--label)]"
                }`}
              >
                {cat.label}
                {count > 0 && <span className="ml-1 opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl border border-[var(--sep)] bg-[var(--gray5)]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] px-6 py-12 text-center">
            <svg className="mx-auto mb-3" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--gray3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <p className="text-[13px] font-medium text-[var(--secondary)]">No photos yet</p>
            <p className="mt-1 text-[11px] text-[var(--tertiary)]">Upload jobsite photos to document progress</p>
            <button
              onClick={() => setShowUpload(true)}
              className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 text-[12px] font-medium text-white transition-all hover:bg-[var(--accent-hover)]"
            >
              Upload First Photo
            </button>
          </div>
        ) : view === "gallery" ? (
          /* Gallery Grid */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setLightboxPhoto(photo)}
                className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--sep)] bg-[var(--gray5)] text-left transition-all hover:shadow-md"
              >
                <img
                  src={getStorageUrl(photo.thumbnail_path ?? photo.storage_path)}
                  alt={photo.caption ?? photo.file_name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                {/* Overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2.5 pt-8">
                  <div className="flex items-center gap-1.5">
                    <CategoryBadge category={photo.category} />
                    {photo.room && (
                      <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
                        {photo.room}
                      </span>
                    )}
                  </div>
                  {photo.caption && (
                    <p className="mt-1 truncate text-[11px] text-white/90">{photo.caption}</p>
                  )}
                  <p className="mt-0.5 text-[10px] text-white/60">{formatDateShort(photo.taken_at)}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Timeline View */
          <div className="space-y-6">
            {grouped.map(([date, dayPhotos]) => (
              <div key={date}>
                <h3 className="mb-2 text-[12px] font-semibold text-[var(--label)]">
                  {formatDate(date)}
                  <span className="ml-2 text-[var(--secondary)] font-normal">{dayPhotos.length} photo{dayPhotos.length !== 1 ? "s" : ""}</span>
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {dayPhotos.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => setLightboxPhoto(photo)}
                      className="group relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl border border-[var(--sep)] bg-[var(--gray5)]"
                    >
                      <img
                        src={getStorageUrl(photo.thumbnail_path ?? photo.storage_path)}
                        alt={photo.caption ?? photo.file_name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 pt-4">
                        <CategoryBadge category={photo.category} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <LightboxModal photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          estimateId={estimateId}
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false);
            fetchPhotos();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lightbox Modal
// ---------------------------------------------------------------------------

function LightboxModal({ photo, onClose }: { photo: JobPhoto; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-4xl w-full overflow-hidden rounded-2xl bg-[var(--card)] shadow-2xl border border-[var(--sep)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <div className="flex items-center justify-center bg-black">
          <img
            src={getStorageUrl(photo.storage_path)}
            alt={photo.caption ?? photo.file_name}
            className="max-h-[65vh] w-full object-contain"
          />
        </div>

        {/* Info bar */}
        <div className="border-t border-[var(--sep)] px-5 py-3.5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {photo.caption && (
                <p className="text-[13px] font-medium text-[var(--label)]">{photo.caption}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <CategoryBadge category={photo.category} />
                {photo.room && (
                  <Badge variant="default" size="sm">{photo.room}</Badge>
                )}
                {photo.tags?.map((tag) => (
                  <Badge key={tag} variant="info" size="sm">{tag}</Badge>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-[12px] text-[var(--secondary)]">{formatDate(photo.taken_at)}</p>
              {photo.taken_by_name && (
                <p className="text-[11px] text-[var(--tertiary)]">by {photo.taken_by_name}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload Modal
// ---------------------------------------------------------------------------

function UploadModal({
  estimateId,
  onClose,
  onUploaded,
}: {
  estimateId: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState("progress");
  const [caption, setCaption] = useState("");
  const [room, setRoom] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0]!;
    if (!f.type.startsWith("image/")) {
      setError("Only image files are allowed");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File must be under 10 MB");
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      // 1. Upload to Supabase Storage
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
      const storagePath = `job-photos/${estimateId}/${Date.now()}-${file.name}`;

      const uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/job-photos/${storagePath}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": file.type,
            "x-upsert": "true",
          },
          body: file,
        },
      );

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage");
      }

      // 2. Create metadata record
      const tagArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/job-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimate_id: estimateId,
          storage_path: `job-photos/${storagePath}`,
          file_name: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
          category,
          caption: caption || null,
          room: room || null,
          tags: tagArray,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save photo record");
      }

      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setUploading(false);
  }, [file, estimateId, category, caption, room, tags, onUploaded]);

  return (
    <Modal open={true} onClose={onClose} title="Upload Photo" width="w-full max-w-[520px]">
      <div className="space-y-4 px-6 py-4">
        {/* Drop zone / File picker */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        {preview ? (
          <div className="relative overflow-hidden rounded-xl border border-[var(--sep)]">
            <img src={preview} alt="Preview" className="max-h-48 w-full object-contain bg-[var(--gray5)]" />
            <button
              onClick={() => {
                setFile(null);
                if (preview) URL.revokeObjectURL(preview);
                setPreview(null);
              }}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            <p className="border-t border-[var(--sep)] bg-[var(--bg)] px-3 py-1.5 text-[11px] text-[var(--secondary)]">
              {file?.name}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--sep)] bg-[var(--bg)] px-6 py-10 transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-light)]"
          >
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--gray3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-[13px] font-medium text-[var(--secondary)]">Drop image or click to browse</p>
            <p className="text-[10px] text-[var(--tertiary)]">Max 10 MB. JPG, PNG, HEIF</p>
          </button>
        )}

        {/* Category */}
        <Field label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={selectClass}
          >
            {UPLOAD_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </Field>

        {/* Caption */}
        <Field label="Caption">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Describe what's in the photo..."
            className={inputClass}
            maxLength={500}
          />
        </Field>

        {/* Room */}
        <Field label="Room / Area">
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="e.g. Kitchen, Master Bath, Exterior..."
            className={inputClass}
          />
        </Field>

        {/* Tags */}
        <Field label="Tags (comma-separated)">
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="demo, day1, framing..."
            className={inputClass}
          />
        </Field>

        {error && (
          <p className="text-[12px] text-[var(--red)]">{error}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--sep)] px-6 py-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--fill)]"
        >
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload Photo"}
        </button>
      </div>
    </Modal>
  );
}
