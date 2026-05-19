// components/TruncatedText.tsx
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useTruncated } from "@/lib/hooks/useTruncated";

export function TruncatedText({ text, className }: { text: string; className?: string }) {
  const { ref, isTruncated } = useTruncated();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          ref={ref as React.Ref<HTMLSpanElement>}
          className={`truncate block ${className}`}
        >
          {text}
        </span>
      </TooltipTrigger>
      {isTruncated && (
        <TooltipContent side="top">{text}</TooltipContent>
      )}
    </Tooltip>
  );
}