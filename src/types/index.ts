export type CourseId = string;

export interface Course {
  id: CourseId;
  title: string;
  tagline: string;
  description: string;
  instructor: string;
  duration: string;
  totalModules: number;
  level: string;
  color: string;
  icon: string;
  weeks: Week[];
  outcomes: string[];
  instructorBio: string;
}

export interface Week {
  id: string;
  title: string;
  isLocked: boolean;
  days: Day[];
  quiz: Quiz;
  isShared?: boolean;
}

export interface Day {
  id: string;
  label: string;
  title: string;
  subModules: SubModule[];
  isCompleted: boolean;
}

export type MixedBlock = 
  | { kind: "video"; title: string; videoUrl: string; description?: string }
  | { kind: "doc"; title: string; content: string };

// ── Multi-section lesson types ────────────────────────────────
export type LessonSectionType = "rich_text" | "image" | "video" | "pdf" | "link";

export type LessonSection =
  | { id: string; type: "rich_text"; content: string }
  | { id: string; type: "image"; url: string; caption?: string; size?: "sm" | "md" | "lg" | "full" }
  | { id: string; type: "video"; url: string; title?: string }
  | { id: string; type: "pdf"; url: string; filename?: string }
  | { id: string; type: "link"; title: string; url: string; description?: string };

export interface SubModule {
  id: string;
  title: string;
  type: "doc" | "video" | "exercise" | "resource" | "quiz" | "mixed" | "assignment";
  duration: string;
  content?: any; // String for rich HTML, or DocContent for legacy structure
  videoUrl?: string;
  description?: string;
  externalLinks?: ExternalLink[];
  isCompleted: boolean;
  blocks?: MixedBlock[]; // for mixed type
  quizData?: any;
  attachedFiles?: { url: string; name: string; type: string }[];
  sections?: LessonSection[]; // new multi-section content
}

export interface DocContent {
  sections: DocSection[];
}

export interface DocSection {
  heading: string;
  body: string;
  codeExample?: string;
  language?: string;
  links?: ExternalLink[];
  callout?: {
    tone: "tip" | "info" | "warning";
    text: string;
  };
}

export interface ExternalLink {
  label: string;
  url: string;
  type: "mdn" | "youtube" | "github" | "article" | "docs";
}

export interface Quiz {
  id: string;
  weekId: string;
  questions: QuizQuestion[];
  passingScore: number;
  maxAttempts: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StudentProgress {
  enrolledCourses: CourseId[];
  completedSubModules: string[];
  completedDays: string[];
  completedWeeks: string[];
  quizResults: QuizResult[];
  xp: number;
  streak: number;
  lastStudiedDate: string;
  badges: string[];
}

export interface QuizResult {
  courseId: CourseId;
  weekId: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
  attemptNumber: number;
  completedAt: string;
}
