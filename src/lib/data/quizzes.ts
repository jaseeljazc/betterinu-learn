import type { Quiz } from "@/types";

export const weekOneQuiz: Quiz = {
  id: "web-basics-week-1",
  weekId: "week-1",
  passingScore: 6,
  maxAttempts: 2,
  questions: [
    {
      id: "q1",
      question: "What does HTML stand for?",
      options: [
        "HyperText Markup Language",
        "HighText Machine Language",
        "HyperText Machine Language",
        "Hyper Transfer Markup Language",
      ],
      correctIndex: 0,
      explanation: "HTML is HyperText Markup Language, the structural markup language of the web.",
    },
    {
      id: "q2",
      question: "Which tag is used to define the largest heading?",
      options: ["<h6>", "<heading>", "<h1>", "<head>"],
      correctIndex: 2,
      explanation: "<h1> is the highest-level page heading and should normally describe the page topic.",
    },
    {
      id: "q3",
      question: "What does CSS stand for?",
      options: ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style System", "Colorful Style Sheets"],
      correctIndex: 1,
      explanation: "CSS means Cascading Style Sheets and controls presentation such as layout, color, and spacing.",
    },
    {
      id: "q4",
      question: "Which HTML tag is used to insert a line break?",
      options: ["<lb>", "<break>", "<br>", "<newline>"],
      correctIndex: 2,
      explanation: "The <br> element creates a line break inside text.",
    },
    {
      id: "q5",
      question: "What is the correct HTML element for inserting a background image?",
      options: ["<img>", "Use CSS background-image property", "<background>", "<picture>"],
      correctIndex: 1,
      explanation: "Background images are presentation, so they belong in CSS with background-image.",
    },
    {
      id: "q6",
      question: "Which HTML attribute specifies an alternate text for an image?",
      options: ["longdesc", "title", "alt", "src"],
      correctIndex: 2,
      explanation: "The alt attribute describes the image for assistive technologies and fallback states.",
    },
    {
      id: "q7",
      question: "What does the <a> tag do in HTML?",
      options: ["Inserts an image", "Creates a hyperlink", "Defines bold text", "Creates a list"],
      correctIndex: 1,
      explanation: "The anchor element creates a link to another page, section, file, or resource.",
    },
    {
      id: "q8",
      question: "Which tag is used to create an unordered list?",
      options: ["<ol>", "<list>", "<ul>", "<li>"],
      correctIndex: 2,
      explanation: "<ul> creates an unordered list, and each item inside it uses <li>.",
    },
    {
      id: "q9",
      question: "What is the correct HTML for creating a text input field?",
      options: ["<textfield>", "<input type=\"text\">", "<field>", "<text>"],
      correctIndex: 1,
      explanation: "Text inputs are made with the input element and type=\"text\".",
    },
    {
      id: "q10",
      question: "What does the <title> tag define?",
      options: [
        "The main heading of a page",
        "The document title shown in the browser tab",
        "A tooltip",
        "A section header",
      ],
      correctIndex: 1,
      explanation: "The title element sets the document title used by browser tabs, bookmarks, and search results.",
    },
  ],
};

export const placeholderQuiz = (weekId: string): Quiz => ({
  ...weekOneQuiz,
  id: `${weekId}-checkpoint`,
  weekId,
  questions: weekOneQuiz.questions.slice(0, 5),
});
