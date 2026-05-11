import type { SubModule } from "@/types";

export function VideoPlayer({ module }: { module: SubModule }) {
  return (
    <figure className="space-y-4">
      <div className="aspect-video overflow-hidden rounded-xl border border-default bg-subtle">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
          src={module.videoUrl}
          title={module.title}
        />
      </div>
      <figcaption>
        <h1 className="font-display text-3xl font-bold">{module.title}</h1>
        <p className="mt-3 text-secondary">{module.description}</p>
      </figcaption>
    </figure>
  );
}
