import { Progress } from "@/components/ui/progress";

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return <Progress value={value} label={label} />;
}
