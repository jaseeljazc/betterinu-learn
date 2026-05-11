import type { DocContent, ExternalLink } from "@/types";
import { mdnLinks, w3Links } from "./links";

const mdn = (label: string, url = mdnLinks.htmlElements): ExternalLink => ({
  label,
  url,
  type: "mdn",
});

const youtube = (label: string, id: string): ExternalLink => ({
  label,
  url: `https://www.youtube.com/watch?v=${id}`,
  type: "youtube",
});

export const commonHtmlResources: ExternalLink[] = [
  mdn("MDN HTML introduction", mdnLinks.htmlIntro),
  { label: "W3Schools HTML reference", url: w3Links.htmlTutorial, type: "docs" },
  youtube("HTML Full Course for Beginners", "pQN-pnXPaVg"),
  youtube("HTML Tutorial for Beginners", "qz0aGYrrlhU"),
];

export const htmlDocs: DocContent = {
  sections: [
    {
      heading: "What is HTML?",
      body:
        "<p>HTML, or HyperText Markup Language, is the standard language for describing the structure and meaning of web pages. It gives content its bones: headings, paragraphs, links, images, forms, and landmarks.</p><p>In the web stack, HTML provides structure, CSS handles style, and JavaScript adds behavior. HTML5 is the current living standard and includes modern semantic elements, multimedia support, and cleaner APIs for web applications.</p>",
      links: [mdn("MDN: Introduction to HTML", mdnLinks.htmlIntro), ...commonHtmlResources.slice(1)],
      callout: { tone: "info", text: "Think of HTML as a document outline that browsers and assistive technologies can understand." },
    },
    {
      heading: "HTML Document Structure",
      body:
        "<p>Every HTML page starts with a document type and a root html element. The head contains metadata for browsers and search engines. The body contains the visible page content.</p><p>The charset meta tag tells the browser how to decode text, the viewport meta tag supports responsive layouts, and the title appears in the browser tab.</p>",
      language: "html",
      codeExample: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My First Page</title>
  </head>
  <body>
    <h1>Hello, web.</h1>
    <p>This is a complete HTML document.</p>
  </body>
</html>`,
      links: [mdn("MDN: Document and website structure", mdnLinks.htmlIntro)],
    },
    {
      heading: "Elements & Tags",
      body:
        "<p>Elements are the building blocks of HTML. Most elements have an opening tag, content, and a closing tag. Void elements such as img, br, and input do not wrap content.</p><p>Nesting matters: close inner elements before outer elements, and keep document structure readable.</p>",
      language: "html",
      codeExample: `<div>
  <p>A paragraph with <strong>nested emphasis</strong>.</p>
  <img src="/course-cover.jpg" alt="Student dashboard preview" />
  <br />
</div>`,
      links: [mdn("MDN: HTML elements", mdnLinks.htmlElements)],
    },
    {
      heading: "Headings",
      body:
        "<p>Headings run from h1 to h6. They create a semantic outline for readers, search engines, and assistive technology. Use one clear h1 for the page topic, then descend logically.</p>",
      language: "html",
      codeExample: `<h1>Course overview</h1>
<h2>Week 1</h2>
<h3>Day 1</h3>
<h4>Lesson notes</h4>
<h5>Reference</h5>
<h6>Footnote</h6>`,
      links: [mdn("MDN: Heading elements", "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements")],
    },
    {
      heading: "Paragraphs & Text",
      body:
        "<p>Use p for paragraphs, span for inline text hooks, strong for importance, em for emphasis, br for a line break, and hr for a thematic break.</p>",
      language: "html",
      codeExample: `<p>
  HTML is <strong>structural</strong>, CSS is <em>visual</em>,
  and JavaScript is behavioral.
</p>
<hr />
<p><span>Next lesson:</span><br />CSS basics.</p>`,
      links: [mdn("MDN: Text content elements", "https://developer.mozilla.org/en-US/docs/Web/HTML/Element#text_content")],
    },
    {
      heading: "Links",
      body:
        "<p>The a element creates hyperlinks. Absolute URLs include the full address, while relative URLs point within the current site. When opening a new tab with target blank, include rel noopener for security.</p>",
      language: "html",
      codeExample: `<a href="https://developer.mozilla.org" target="_blank" rel="noopener">
  Visit MDN
</a>
<a href="/dashboard">Go to dashboard</a>`,
      links: [mdn("MDN: Anchor element", "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a")],
      callout: { tone: "tip", text: "Link text should describe the destination. Avoid vague phrases such as click here." },
    },
    {
      heading: "Images",
      body:
        "<p>The img element embeds an image. Always include alt text that communicates the image meaning. Width and height help browsers reserve space before the image loads.</p>",
      language: "html",
      codeExample: `<img
  src="/student-progress.png"
  alt="Progress chart showing completed modules"
  width="640"
  height="360"
/>`,
      links: [mdn("MDN: Image element", "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img")],
    },
    {
      heading: "Lists",
      body:
        "<p>Use ul for unordered lists, ol for ordered lists, and li for each item. Lists can be nested when the hierarchy is meaningful.</p>",
      language: "html",
      codeExample: `<ol>
  <li>Open the editor</li>
  <li>Write HTML
    <ul>
      <li>Add headings</li>
      <li>Add paragraphs</li>
    </ul>
  </li>
</ol>`,
      links: [mdn("MDN: Lists", "https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML/HTML_text_fundamentals#lists")],
    },
    {
      heading: "Tables",
      body:
        "<p>Tables are for tabular data. Use thead and tbody to group rows, tr for rows, th for headers, and td for cells. Colspan and rowspan let cells span multiple columns or rows.</p>",
      language: "html",
      codeExample: `<table>
  <thead>
    <tr><th>Tag</th><th>Purpose</th><th>Type</th></tr>
  </thead>
  <tbody>
    <tr><td>h1</td><td>Main heading</td><td>Text</td></tr>
    <tr><td>a</td><td>Hyperlink</td><td>Inline</td></tr>
  </tbody>
</table>`,
      links: [mdn("MDN: Table element", "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table")],
    },
    {
      heading: "Forms",
      body:
        "<p>Forms collect input. Pair labels with controls, choose the right input type, and use attributes such as required or disabled to communicate constraints.</p>",
      language: "html",
      codeExample: `<form>
  <label for="email">Email</label>
  <input id="email" type="email" placeholder="you@example.com" required />
  <label for="message">Message</label>
  <textarea id="message"></textarea>
  <select aria-label="Topic">
    <option>Course help</option>
    <option>Billing</option>
  </select>
  <button type="submit">Send</button>
</form>`,
      links: [mdn("MDN: Forms guide", mdnLinks.formsGuide)],
      callout: { tone: "warning", text: "Never rely on placeholder text as the only label for an input." },
    },
    {
      heading: "Semantic HTML",
      body:
        "<p>Semantic elements communicate the role of page regions. They improve accessibility, search engine understanding, and maintainability.</p>",
      language: "html",
      codeExample: `<header>
  <nav>Primary navigation</nav>
</header>
<main>
  <section>
    <article>Lesson content</article>
    <aside>Related resources</aside>
  </section>
</main>
<footer>Copyright and links</footer>`,
      links: [mdn("MDN: Semantics in HTML", mdnLinks.semanticHTML)],
    },
    {
      heading: "HTML Attributes",
      body:
        "<p>Attributes add information to elements. Global attributes include id, class, style, title, and data attributes. Element-specific attributes include href, src, alt, placeholder, required, and disabled.</p>",
      language: "html",
      codeExample: `<button
  id="save-progress"
  class="button"
  data-course-id="mern"
  title="Save progress"
  disabled
>
  Save
</button>`,
      links: [mdn("MDN: HTML attributes", "https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes")],
    },
    {
      heading: "Comments",
      body:
        "<p>HTML comments are ignored by the browser. Use them to explain unusual markup decisions, not to narrate obvious structure.</p>",
      language: "html",
      codeExample: `<!-- The empty landmark is populated by the CMS at runtime. -->
<section id="announcements"></section>`,
      links: [mdn("MDN: Comments", "https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Comments")],
    },
    {
      heading: "Quick Reference Table",
      body:
        "<table><thead><tr><th>Tag</th><th>Description</th></tr></thead><tbody><tr><td>html</td><td>Root document element</td></tr><tr><td>head</td><td>Metadata container</td></tr><tr><td>body</td><td>Visible content container</td></tr><tr><td>h1-h6</td><td>Heading levels</td></tr><tr><td>p</td><td>Paragraph</td></tr><tr><td>a</td><td>Hyperlink</td></tr><tr><td>img</td><td>Image</td></tr><tr><td>ul, ol, li</td><td>Lists</td></tr><tr><td>table, tr, th, td</td><td>Tabular data</td></tr><tr><td>form, input, label</td><td>Form controls</td></tr><tr><td>header, main, section, footer</td><td>Semantic layout</td></tr></tbody></table>",
      links: commonHtmlResources,
    },
  ],
};
