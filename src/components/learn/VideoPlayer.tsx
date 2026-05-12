import type { SubModule } from "@/types";

function getEmbedUrl(url: string | undefined) {
  if (!url) return "";

  // If it's just an ID (no slashes or dots)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return `https://www.youtube.com/embed/${url}`;
  }

  // If it's a youtube watch URL
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com") && parsed.searchParams.has("v")) {
      return `https://www.youtube.com/embed/${parsed.searchParams.get("v")}`;
    }
    if (parsed.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed${parsed.pathname}`;
    }
  } catch (e) {
    // Ignore URL parse errors
  }

  return url;
}

export function VideoPlayer({ module }: { module: SubModule }) {
  const embedUrl = getEmbedUrl(module.videoUrl);

  return (
    <figure className="space-y-5">

      {/* Video player */}
      {embedUrl ? (
        <div className="mx-auto max-w-5xl">
          <div className="aspect-video overflow-hidden rounded-xl border border-default bg-subtle shadow-lg">
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
              src={embedUrl}
              title={module.title}
            />
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-5xl">
          <div className="aspect-video flex items-center justify-center rounded-xl border border-dashed border-default bg-subtle text-secondary">
            <p>No video URL provided.</p>
          </div>
        </div>
      )}

      {/* Summary always below the video */}
      {module.description && (
        <figcaption className="mx-auto max-w-5xl rounded-xl bg-surface border border-default p-5">
          <h3 className="font-bold text-sm uppercase tracking-widest text-muted mb-2">Lesson Summary</h3>
          <p className="text-secondary leading-relaxed">{module.description}</p>
        </figcaption>
      )}
    </figure>
  );
}
