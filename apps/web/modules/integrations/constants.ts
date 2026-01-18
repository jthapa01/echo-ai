export const INTEGRATIONS = [
  {
    id: "html",
    title: "HTML Snippet",
    description: "Embed using a simple HTML snippet.",
    icon: "/languages/html5.svg",
  },
  {
    id: "react",
    title: "React Component",
    description: "Embed using a React component.",
    icon: "/languages/react.svg",
  },
  {
    id: "nextjs",
    title: "Next.js Component",
    description: "Embed using a Next.js component.",
    icon: "/languages/nextjs.svg",
  },
  {
    id: "javascript",
    title: "JavaScript Snippet",
    description: "Embed using a JavaScript snippet.",
    icon: "/languages/javascript.svg",
  },
] as const;

export type IntegrationId = (typeof INTEGRATIONS)[number]["id"];

export const HTML_SCRIPT = `<script src="http://localhost:3001/widget.js" data-organization-id="{{ORGANIZATION_ID}}"></script>`;
export const REACT_SCRIPT = `<script src="http://localhost:3001/widget.js" data-organization-id="{{ORGANIZATION_ID}}"></script>`;
export const NEXTJS_SCRIPT = `<script src="http://localhost:3001/widget.js" data-organization-id="{{ORGANIZATION_ID}}"></script>`;
export const JAVASCRIPT_SCRIPT = `<script src="http://localhost:3001/widget.js" data-organization-id="{{ORGANIZATION_ID}}"></script>`;