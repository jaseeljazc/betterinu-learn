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
  image:string
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
export type LessonSectionType =
  | "rich_text"
  | "image"
  | "video"
  | "pdf"
  | "link"
  | "task"
  | "columns";

export type LessonSection =
  | {
      id: string;
      type: "rich_text";
      content: string;
      align?: "left" | "center" | "right";
      paddingX?: "none" | "sm" | "md" | "lg" | "xl";
      bgColor?: string;
    }
  | {
      id: string;
      type: "image";
      url: string;
      caption?: string;
      size?: "sm" | "md" | "lg" | "full";
      align?: "left" | "center" | "right";
      captionAlign?: "left" | "center" | "right";
      paddingX?: "none" | "sm" | "md" | "lg" | "xl";
      bgColor?: string;
    }
  | {
      id: string;
      type: "video";
      url: string;
      title?: string;
      align?: "left" | "center" | "right";
      size?: "sm" | "md" | "lg" | "full";
      paddingX?: "none" | "sm" | "md" | "lg" | "xl";
      bgColor?: string;
    }
  | {
      id: string;
      type: "pdf";
      url: string;
      filename?: string;
      align?: "left" | "center" | "right";
      paddingX?: "none" | "sm" | "md" | "lg" | "xl";
      bgColor?: string;
    }
  | {
      id: string;
      type: "link";
      title: string;
      url: string;
      description?: string;
      thumbnailUrl?: string;
      align?: "left" | "center" | "right";
      paddingX?: "none" | "sm" | "md" | "lg" | "xl";
      bgColor?: string;
    }
  | {
      id: string;
      type: "task";
      title: string;
      description: string;
      submissionType: string;
      deadline?: string;
      align?: "left" | "center" | "right";
      paddingX?: "none" | "sm" | "md" | "lg" | "xl";
      bgColor?: string;
    }
  | {
      id: string;
      type: "columns";
      columnCount: 2 | 3;
      cols: Array<{
        id: string;
        type: Exclude<LessonSectionType, "columns" | "task">;
        content?: string;
        url?: string;
        caption?: string;
        captionAlign?: string;
        size?: string;
        title?: string;
        filename?: string;
        description?: string;
        align?: string;
      }>;
      align?: string;
      paddingX?: "none" | "sm" | "md" | "lg" | "xl";
      bgColor?: string;
    };

// ── Quiz SubModule types ──────────────────────────────────────
export interface QuizSubModuleQuestion {
  id: string;
  type: "mcq" | "text";
  question: string;
  description?: string; // optional sub-instructions
  options?: string[]; // MCQ only (up to 6)
  correctIndex?: number; // MCQ: index of correct option
  correctText?: string; // Text: correct answer string (case-insensitive)
  marks: number; // points this question is worth
  explanation?: string; // feedback shown after answering
}

export interface QuizSubModuleData {
  questions: QuizSubModuleQuestion[];
  passingScore?: number; // 0–100 percentage required to pass
  maxAttempts?: number; // undefined = unlimited
  totalMarks?: number; // auto-calculated
}

// ── Assignment SubModule types ────────────────────────────────
export interface AssignmentSubModuleData {
  title: string;
  instructions: string; // rich HTML content
  dueDate?: string; // ISO date string (optional)
  totalMarks?: number;
  allowedSubmissionTypes: Array<"text" | "file" | "image" | "url">;
  requiresApproval: boolean; // if true, gates the next day
  attachedFiles?: Array<{ url: string; name: string; type: string }>; // admin-uploaded resources
  referenceLinks?: Array<{ label: string; url: string }>; // admin reference links
}

export interface SubModule {
  id: string;
  title: string;
  type:
    | "doc"
    | "video"
    | "exercise"
    | "resource"
    | "quiz"
    | "mixed"
    | "assignment"
    | "lesson";
  duration: string;
  content?: any; // String for rich HTML, or DocContent for legacy structure
  videoUrl?: string;
  description?: string;
  externalLinks?: ExternalLink[];
  isCompleted: boolean;
  blocks?: MixedBlock[]; // for mixed type
  quizData?: QuizSubModuleData; // for type: "quiz"
  assignmentData?: AssignmentSubModuleData; // for type: "assignment"
  attachedFiles?: { url: string; name: string; type: string }[];
  sections?: LessonSection[]; // new multi-section content
  pagePadding?: "none" | "sm" | "md" | "lg" | "xl";
  pageBgColor?: string;
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

export type {
  AdminRole,
  PermissionModule,
  PermissionAction,
  Permission,
  AdminRoleRecord,
  AdminAccount,
} from "./rbac"

// ── Account Manager types ─────────────────────────────────────
export type AccountType = 'cash' | 'bank' | 'digital_wallet' | 'petty_cash'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type TransactionStatus = 'confirmed' | 'pending' | 'void'

export interface Account {
  id: string; name: string; type: AccountType; accountNumber?: string; ifscCode?: string
  openingBalance: number; currentBalance: number; isActive: boolean
  createdBy?: { id: string; fullName: string }; createdAt: string
}

export interface AccountCategory {
  id: string; name: string; type: 'income' | 'expense'
  color?: string; icon?: string; isSystem: boolean; isArchived: boolean
}

export interface AccountAttachment {
  id: string; transactionId: string; s3Key: string
  fileName: string; fileType: string; fileSize: number
  uploadedBy?: { id: string; fullName: string }; uploadedAt: string
  presignedUrl?: string  // never stored — fetched fresh on demand only
}

export interface AccountTransaction {
  id: string; type: TransactionType
  account: Pick<Account, 'id' | 'name' | 'type'>
  toAccount?: Pick<Account, 'id' | 'name' | 'type'>
  category?: AccountCategory; amount: number; date: string
  description?: string; referenceNumber?: string
  status: TransactionStatus
  attachments?: AccountAttachment[]
  createdBy?: { id: string; fullName: string }; createdAt: string
  voidedBy?: { id: string; fullName: string }; voidedAt?: string
}
