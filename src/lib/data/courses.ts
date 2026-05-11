import type { Course, CourseId, Day, SubModule, Week } from "@/types";
import { htmlDocs } from "./htmlDocs";
import { mdnLinks, otherLinks, w3Links } from "./links";
import { placeholderQuiz, weekOneQuiz } from "./quizzes";

const video = (id: string) => `https://www.youtube.com/embed/${id}`;

const sharedDays: Day[] = [
  {
    id: "shared-web-day-1",
    label: "Day 1 - Monday",
    title: "Introduction to the Web",
    isCompleted: false,
    subModules: [
      {
        id: "shared-web-how-internet-works",
        title: "How the Internet Works",
        type: "doc",
        duration: "~10 min",
        isCompleted: false,
        description: "Packets, DNS, servers, clients, and the request-response loop in plain language.",
        externalLinks: [
          { label: "MDN: How the Web works", url: mdnLinks.htmlIntro, type: "mdn" },
          { label: "Wikipedia: HTTP", url: otherLinks.wikipediaHttp, type: "article" },
        ],
        content: {
          sections: [
            {
              heading: "The Web in One Loop",
              body:
                "<p>When you visit a site, your browser resolves a domain, connects to a server, requests a resource, and renders the response. The web is built from small agreements: URLs identify resources, HTTP carries messages, and browsers turn HTML, CSS, and JavaScript into interfaces.</p>",
              links: [{ label: "MDN: HTTP overview", url: mdnLinks.httpOverview, type: "mdn" }],
            },
          ],
        },
      },
      {
        id: "shared-web-browser-video",
        title: "What is a Web Browser?",
        type: "video",
        duration: "~8 min",
        videoUrl: video("zN8YNNHcaZc"),
        description: "A fast visual walkthrough of how browsers fetch, parse, and render web pages.",
        isCompleted: false,
      },
      {
        id: "shared-web-http-https",
        title: "HTTP & HTTPS Explained",
        type: "doc",
        duration: "~12 min",
        isCompleted: false,
        externalLinks: [
          { label: "MDN: HTTP overview", url: mdnLinks.httpOverview, type: "mdn" },
          { label: "Wikipedia: HTTP", url: otherLinks.wikipediaHttp, type: "article" },
        ],
        content: {
          sections: [
            {
              heading: "HTTP and HTTPS",
              body:
                "<p>HTTP is the protocol browsers and servers use to exchange requests and responses. HTTPS adds encryption and identity checks with TLS, protecting users from snooping and tampering.</p>",
              links: [{ label: "MDN: HTTP overview", url: mdnLinks.httpOverview, type: "mdn" }],
            },
          ],
        },
      },
    ],
  },
  {
    id: "shared-web-day-2",
    label: "Day 2 - Tuesday",
    title: "HTML Fundamentals",
    isCompleted: false,
    subModules: [
      {
        id: "shared-web-html-intro",
        title: "What is HTML?",
        type: "doc",
        duration: "~15 min",
        isCompleted: false,
        content: htmlDocs,
        externalLinks: [
          { label: "MDN HTML reference", url: mdnLinks.htmlElements, type: "mdn" },
          { label: "W3Schools HTML tutorial", url: w3Links.htmlTutorial, type: "docs" },
        ],
      },
      {
        id: "shared-web-html-tags",
        title: "HTML Tags & Elements",
        type: "doc",
        duration: "~12 min",
        isCompleted: false,
        content: {
          sections: [
            {
              heading: "Tags, Elements, and Meaning",
              body:
                "<p>Tags mark where an element starts and ends. Elements give content meaning, which lets browsers, readers, and search engines understand the page.</p>",
              codeExample: "<p>A paragraph with <strong>important text</strong>.</p>",
              language: "html",
              links: [{ label: "MDN HTML elements", url: mdnLinks.htmlElements, type: "mdn" }],
            },
          ],
        },
      },
      {
        id: "shared-web-html-100",
        title: "HTML in 100 Seconds",
        type: "video",
        duration: "~3 min",
        videoUrl: video("ok-plXXHlWw"),
        description: "A rapid overview of HTML syntax and semantics.",
        isCompleted: false,
      },
      {
        id: "shared-web-first-page",
        title: "Build your first webpage",
        type: "video",
        duration: "~20 min",
        videoUrl: video("UB1O30fR-EE"),
        description: "A practical crash course for writing a complete HTML page.",
        isCompleted: false,
      },
    ],
  },
  {
    id: "shared-web-day-3",
    label: "Day 3 - Wednesday",
    title: "CSS Basics",
    isCompleted: false,
    subModules: [
      docModule("shared-web-css-intro", "Introduction to CSS", "~15 min", "CSS turns structured HTML into designed layouts and interfaces.", mdnLinks.cssIntro),
      docModule("shared-web-css-selectors", "Selectors & Properties", "~12 min", "Selectors choose elements, and declarations assign visual properties.", mdnLinks.cssIntro),
      {
        id: "shared-web-css-100",
        title: "CSS in 100 Seconds",
        type: "video",
        duration: "~3 min",
        videoUrl: video("OEV8gMkCHXQ"),
        description: "A compact explanation of selectors, properties, and layout primitives.",
        isCompleted: false,
      },
      docModule("shared-web-css-box-model", "CSS Box Model", "~10 min", "Every element is a box with content, padding, border, and margin.", mdnLinks.cssIntro),
    ],
  },
  {
    id: "shared-web-day-4",
    label: "Day 4 - Thursday",
    title: "JavaScript Basics",
    isCompleted: false,
    subModules: [
      docModule("shared-web-js-intro", "What is JavaScript?", "~12 min", "JavaScript adds behavior, interactivity, and application logic to web pages.", mdnLinks.jsIntro),
      docModule("shared-web-js-dom", "Variables, Functions & DOM", "~15 min", "Variables store values, functions package behavior, and the DOM represents the page.", mdnLinks.jsIntro),
      {
        id: "shared-web-js-100",
        title: "JavaScript in 100 Seconds",
        type: "video",
        duration: "~3 min",
        videoUrl: video("DHjqpvDnNGE"),
        description: "A brisk tour of JavaScript fundamentals.",
        isCompleted: false,
      },
      {
        id: "shared-web-dom-video",
        title: "JS DOM Manipulation",
        type: "video",
        duration: "~25 min",
        videoUrl: video("0ik6X4DJKCc"),
        description: "Hands-on DOM manipulation with vanilla JavaScript.",
        isCompleted: false,
        externalLinks: [{ label: "javascript.info", url: otherLinks.jsInfo, type: "docs" }],
      },
    ],
  },
  {
    id: "shared-web-day-5",
    label: "Day 5 - Friday",
    title: "Developer Tools & Git Basics",
    isCompleted: false,
    subModules: [
      docModule("shared-web-devtools", "Browser DevTools", "~10 min", "Inspect layout, debug JavaScript, profile performance, and watch network requests.", mdnLinks.htmlIntro),
      docModule("shared-web-git-intro", "Git & Version Control Intro", "~12 min", "Git records project history and makes collaboration safer.", otherLinks.gitOfficial),
      {
        id: "shared-web-git-100",
        title: "Git in 100 Seconds",
        type: "video",
        duration: "~2 min",
        videoUrl: video("HkdAHXoRtos"),
        description: "A quick model for commits, branches, remotes, and collaboration.",
        isCompleted: false,
        externalLinks: [
          { label: "Git docs", url: otherLinks.gitOfficial, type: "docs" },
          { label: "GitHub guides", url: otherLinks.githubDocs, type: "github" },
        ],
      },
    ],
  },
];

function docModule(id: string, title: string, duration: string, body: string, url: string): SubModule {
  return {
    id,
    title,
    type: "doc",
    duration,
    isCompleted: false,
    externalLinks: [{ label: "Reference", url, type: "docs" }],
    content: {
      sections: [
        {
          heading: title,
          body: `<p>${body}</p>`,
          links: [{ label: "Reference", url, type: "docs" }],
        },
      ],
    },
  };
}

function sharedWebWeek(): Week {
  return {
    id: "week-1",
    title: "Week 1: Basics of Web Development",
    isLocked: false,
    isShared: true,
    days: sharedDays,
    quiz: weekOneQuiz,
  };
}

function placeholderWeek(courseId: CourseId, index: number, title: string): Week {
  const dayCount = 5;
  return {
    id: `week-${index}`,
    title: `Week ${index}: ${title}`,
    isLocked: true,
    quiz: placeholderQuiz(`week-${index}`),
    days: Array.from({ length: dayCount }, (_, dayIndex) => ({
      id: `${courseId}-week-${index}-day-${dayIndex + 1}`,
      label: `Day ${dayIndex + 1}`,
      title: ["Concepts", "Practice", "Workshop", "Project Lab", "Review"][dayIndex],
      isCompleted: false,
      subModules: [
        docModule(
          `${courseId}-week-${index}-day-${dayIndex + 1}-lesson`,
          `${title} - lesson ${dayIndex + 1}`,
          "~18 min",
          "This placeholder lesson is locked in the demo. Complete the previous week and pass the quiz to reveal it.",
          otherLinks.freeCodeCamp,
        ),
      ],
    })),
  };
}

export const courses: Course[] = [
  {
    id: "mern",
    title: "MERN Stack Development",
    tagline: "Build modern full-stack apps with MongoDB, Express, React, and Node.",
    description:
      "A practical full-stack path that starts with shared web foundations and grows into React interfaces, APIs, authentication, deployment, and portfolio-ready projects.",
    instructor: "Aarav Mehta",
    instructorBio: "Full-stack mentor focused on production patterns, clean APIs, and developer confidence.",
    duration: "8 Weeks",
    totalModules: 34,
    level: "Intermediate",
    color: "--course-mern",
    icon: "Code2",
    outcomes: ["HTML, CSS, and JS fluency", "React component architecture", "REST API design", "MongoDB data modeling", "Authentication flows", "Deployment readiness"],
    weeks: [
      sharedWebWeek(),
      placeholderWeek("mern", 2, "JavaScript Deep Dive"),
      placeholderWeek("mern", 3, "React Foundations"),
      placeholderWeek("mern", 4, "Node and Express"),
      placeholderWeek("mern", 5, "MongoDB and Mongoose"),
      placeholderWeek("mern", 6, "Auth and Security"),
      placeholderWeek("mern", 7, "Full-Stack Project"),
      placeholderWeek("mern", 8, "Deployment and Portfolio"),
    ],
  },
  {
    id: "python",
    title: "Python Programming",
    tagline: "Go from first script to confident problem solver.",
    description:
      "A beginner-friendly Python course with shared web foundations, programming basics, data structures, files, APIs, and automation projects.",
    instructor: "Mira Kapoor",
    instructorBio: "Python educator who turns fundamentals into small, memorable daily wins.",
    duration: "8 Weeks",
    totalModules: 32,
    level: "Beginner",
    color: "--course-python",
    icon: "Terminal",
    outcomes: ["Programming fundamentals", "Python syntax", "Control flow", "Functions and modules", "Files and APIs", "Automation projects"],
    weeks: [
      sharedWebWeek(),
      placeholderWeek("python", 2, "Python Fundamentals"),
      placeholderWeek("python", 3, "Control Flow"),
      placeholderWeek("python", 4, "Functions and Modules"),
      placeholderWeek("python", 5, "Data Structures"),
      placeholderWeek("python", 6, "Files and APIs"),
      placeholderWeek("python", 7, "Automation"),
      placeholderWeek("python", 8, "Capstone Project"),
    ],
  },
  {
    id: "hr",
    title: "HR Management",
    tagline: "Learn people operations, hiring, culture, and compliance.",
    description:
      "A grounded HR path for beginners covering recruitment, employee experience, policy basics, performance conversations, and HR analytics.",
    instructor: "Neha Rao",
    instructorBio: "People operations leader with a practical, humane approach to teams and process.",
    duration: "6 Weeks",
    totalModules: 24,
    level: "Beginner",
    color: "--course-hr",
    icon: "Users",
    outcomes: ["Recruitment workflows", "Onboarding systems", "Employee relations", "Performance reviews", "Policy literacy", "HR metrics"],
    weeks: [
      placeholderWeek("hr", 1, "People Operations Foundations"),
      placeholderWeek("hr", 2, "Hiring and Interviewing"),
      placeholderWeek("hr", 3, "Onboarding and Culture"),
      placeholderWeek("hr", 4, "Performance Management"),
      placeholderWeek("hr", 5, "Policy and Compliance"),
      placeholderWeek("hr", 6, "HR Analytics"),
    ].map((week, index) => ({ ...week, isLocked: index !== 0 })),
  },
  {
    id: "marketing",
    title: "Epic Marketing",
    tagline: "Plan campaigns across content, social, search, and analytics.",
    description:
      "A digital marketing track for beginners covering positioning, content strategy, social channels, SEO, paid campaigns, and measurement.",
    instructor: "Kabir Sethi",
    instructorBio: "Growth strategist who teaches campaigns as systems, not slogans.",
    duration: "6 Weeks",
    totalModules: 24,
    level: "Beginner",
    color: "--course-marketing",
    icon: "Megaphone",
    outcomes: ["Audience research", "Content planning", "SEO basics", "Social campaigns", "Paid media thinking", "Analytics dashboards"],
    weeks: [
      placeholderWeek("marketing", 1, "Marketing Foundations"),
      placeholderWeek("marketing", 2, "Content Strategy"),
      placeholderWeek("marketing", 3, "Social Media Systems"),
      placeholderWeek("marketing", 4, "SEO and Search Intent"),
      placeholderWeek("marketing", 5, "Paid Campaigns"),
      placeholderWeek("marketing", 6, "Analytics and Reporting"),
    ].map((week, index) => ({ ...week, isLocked: index !== 0 })),
  },
];

export function getCourse(courseId: string) {
  return courses.find((course) => course.id === courseId);
}

export function getWeek(courseId: string, weekId: string) {
  return getCourse(courseId)?.weeks.find((week) => week.id === weekId);
}

export function getSubModule(courseId: string, moduleId: string) {
  const course = getCourse(courseId);
  if (!course) {
    return null;
  }

  for (const week of course.weeks) {
    for (const day of week.days) {
      const subModule = day.subModules.find((item) => item.id === moduleId);
      if (subModule) {
        return { course, week, day, subModule };
      }
    }
  }

  return null;
}
