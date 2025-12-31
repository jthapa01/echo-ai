import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import rag from "@convex-dev/rag/convex.config";

const app = defineApp(); // Create the app configuration
app.use(agent); // Register the agent component
app.use(rag); // Register the rag component

export default app;