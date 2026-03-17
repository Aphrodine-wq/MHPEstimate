import { useRef, useState, useEffect, useCallback } from "react";

interface DigitalSignatureProps {
  onSign: (signatureDataUrl: string) => void;
  signerName: string;
  width?: number;
  height?: number;
  disabled?: boolean;
}

export function DigitalSignature({
  onSign,
  signerName,
  width = 500,
  height = 200,
  disabled = false,
}: DigitalSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Set up canvas resolution for retina displays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1a1a1a";
  }, [width, height]);

  const getPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0]!.clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled || accepted) return;
      e.preventDefault();
      setDrawing(true);
      lastPos.current = getPos(e);
    },
    [disabled, accepted, getPos]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!drawing || !lastPos.current) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
      setHasSignature(true);
    },
    [drawing, getPos]
  );

  const stopDrawing = useCallback(() => {
    setDrawing(false);
    lastPos.current = null;
  }, []);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasSignature(false);
    setAccepted(false);
  }, []);

  const handleAccept = useCallback(() => {
    if (!hasSignature) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setAccepted(true);
    onSign(dataUrl);
  }, [hasSignature, onSign]);

  const timestamp = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="surface-elevated overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--sep)] px-4 py-3">
        <p className="text-[13px] font-semibold text-[var(--label)]">Digital Signature</p>
        <p className="text-[11px] text-[var(--secondary)]">
          Sign below to accept this estimate
        </p>
      </div>

      {/* Canvas */}
      <div className="relative px-4 py-4">
        <div
          className={`relative rounded-lg border-2 border-dashed ${
            accepted
              ? "border-[var(--green)] bg-green-50/30"
              : hasSignature
                ? "border-[var(--accent)] bg-white"
                : "border-[var(--gray4)] bg-white"
          } transition-colors`}
        >
          <canvas
            ref={canvasRef}
            className={`block w-full cursor-crosshair touch-none ${accepted ? "opacity-80" : ""}`}
            style={{ maxWidth: width, height }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasSignature && !accepted && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="text-[13px] text-[var(--gray3)]">Draw your signature here</p>
            </div>
          )}
          {/* Signature line */}
          <div className="absolute bottom-4 left-8 right-8 border-b border-[var(--gray4)]" />
        </div>
      </div>

      {/* Signer info */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between text-[11px] text-[var(--secondary)]">
          <span>{signerName}</span>
          <span>{timestamp}</span>
        </div>
      </div>

      {/* Legal disclaimer */}
      <div className="px-4 pb-3">
        <p className="text-[10px] text-[var(--gray2)] leading-relaxed">
          By signing above, you agree to the terms, scope, and pricing outlined in this estimate.
          This digital signature is legally binding and constitutes acceptance of the proposed work.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-[var(--sep)] px-4 py-3">
        <button
          onClick={handleClear}
          disabled={disabled || (!hasSignature && !accepted)}
          className="rounded-lg border border-[var(--sep)] px-4 py-2 text-[12px] font-medium text-[var(--label)] transition-colors hover:bg-[var(--bg)] disabled:opacity-40"
        >
          Clear
        </button>
        <button
          onClick={handleAccept}
          disabled={disabled || !hasSignature || accepted}
          className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 text-[12px] font-medium text-white transition-all active:scale-[0.98] disabled:opacity-40"
        >
          {accepted ? (
            <span className="flex items-center justify-center gap-1.5">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Signed
            </span>
          ) : (
            "Accept & Sign"
          )}
        </button>
      </div>
    </div>
  );
}
