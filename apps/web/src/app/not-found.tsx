import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--bg)", color: "var(--label)" }}
    >
      <div className="text-center">
        <p className="text-[80px] font-bold leading-none" style={{ color: "var(--accent)" }}>
          404
        </p>
        <h1 className="mt-2 text-[22px] font-semibold">Page not found</h1>
        <p className="mt-2 text-[14px]" style={{ color: "var(--secondary)" }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl px-6 py-3 text-[14px] font-medium text-white transition-all hover:opacity-90 active:scale-[0.97]"
          style={{ background: "var(--accent)" }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
