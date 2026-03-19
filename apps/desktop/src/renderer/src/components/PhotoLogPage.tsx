import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { EmptyState } from "./EmptyState";
import {
  CameraIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";

interface JobPhoto {
  id: string;
  estimate_id: string;
  storage_path: string;
  file_name: string;
  file_size_bytes: number | null;
  category: string;
  caption: string | null;
  room: string | null;
  tags: string[];
  taken_at: string;
  taken_by_name: string | null;
  created_at: string;
}

const CATEGORIES = ["all", "before", "during", "after", "issue", "progress", "material", "inspection", "safety", "other"];

const CATEGORY_STYLE: Record<string, string> = {
  before: "bg-[#e3f2fd] text-[#1565c0]",
  during: "bg-[#fff3e0] text-[#e65100]",
  after: "bg-[#e8f5e9] text-[#2e7d32]",
  issue: "bg-[#ffebee] text-[#c62828]",
  progress: "bg-[var(--gray5)] text-[var(--gray1)]",
  material: "bg-[#f3e5f5] text-[#6a1b9a]",
  inspection: "bg-[#e0f7fa] text-[#00695c]",
  safety: "bg-[#fff8e1] text-[#f57f17]",
  other: "bg-[var(--gray5)] text-[var(--secondary)]",
};

export function PhotoLogPage() {
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");

  const refresh = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("job_photos")
      .select("*")
      .order("taken_at", { ascending: false })
      .limit(200);
    setPhotos((data as JobPhoto[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = category === "all" ? photos : photos.filter((p) => p.category === category);

  const handleUploadPlaceholder = () => {
    console.log("[PhotoLog] Upload button clicked — desktop file handling requires native dialog integration.");
  };

  if (!supabase) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[14px] text-[var(--secondary)]">Supabase not configured</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto animate-page-enter">
      <header className="flex items-center justify-between px-8 pt-4 pb-1">
        <p className="text-[12px] text-[var(--secondary)]">{photos.length} photos</p>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="rounded-lg border border-[var(--sep)] p-1.5 transition-colors hover:bg-[var(--bg)]">
            <ArrowPathIcon className="h-3.5 w-3.5 text-[var(--secondary)]" />
          </button>
          <button onClick={handleUploadPlaceholder} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-all hover:brightness-110 active:scale-[0.98]">
            <ArrowUpTrayIcon className="h-3.5 w-3.5" />
            Upload Photo
          </button>
        </div>
      </header>

      {/* Category filter tabs */}
      <div className="px-8 py-3">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                category === c ? "bg-[var(--accent)] text-white" : "bg-[var(--gray5)] text-[var(--secondary)] hover:bg-[var(--gray4)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Photo grid */}
      <div className="flex-1 overflow-y-auto px-8 pb-6">
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-skeleton rounded-xl bg-[var(--gray5)]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No photos"
            description={category !== "all" ? `No ${category} photos yet` : "Upload jobsite photos to build your photo log"}
            action={category === "all" ? "Upload Photo" : undefined}
          />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filtered.map((p, i) => (
              <div
                key={p.id}
                className="group rounded-xl border border-[var(--sep)] bg-[var(--card)] overflow-hidden shadow-[var(--shadow-card)] transition-all hover:shadow-lg animate-list-item"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Photo placeholder area */}
                <div className="h-32 bg-[var(--gray5)] flex items-center justify-center relative">
                  <CameraIcon className="h-8 w-8 text-[var(--gray3)]" />
                  <span className={`absolute top-2 right-2 rounded px-1.5 py-0.5 text-[9px] font-semibold ${CATEGORY_STYLE[p.category] ?? CATEGORY_STYLE.other}`}>
                    {p.category}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-[12px] font-medium truncate">{p.file_name}</p>
                  {p.caption && <p className="text-[11px] text-[var(--secondary)] truncate mt-0.5">{p.caption}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[10px] text-[var(--gray2)]">
                      {new Date(p.taken_at).toLocaleDateString()}
                    </p>
                    {p.room && (
                      <span className="rounded bg-[var(--gray5)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--secondary)]">{p.room}</span>
                    )}
                  </div>
                  {p.taken_by_name && <p className="text-[10px] text-[var(--gray3)] mt-1">by {p.taken_by_name}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
