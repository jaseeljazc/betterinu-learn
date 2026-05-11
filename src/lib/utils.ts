type ClassValue = string | number | false | null | undefined | Record<string, boolean | undefined>;

export function cn(...inputs: ClassValue[]) {
  return inputs
    .flatMap((input) => {
      if (!input) {
        return [];
      }

      if (typeof input === "object") {
        return Object.entries(input)
          .filter(([, value]) => value)
          .map(([key]) => key);
      }

      return [String(input)];
    })
    .join(" ");
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function notify(message: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent("learnforge-toast", { detail: message }));
}
