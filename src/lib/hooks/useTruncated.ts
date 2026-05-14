// hooks/useTruncated.ts
import { useRef, useState, useEffect } from "react";

export function useTruncated() {
  const ref = useRef<HTMLElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setIsTruncated(el.scrollWidth > el.clientWidth);
  }, []);

  return { ref, isTruncated };
}