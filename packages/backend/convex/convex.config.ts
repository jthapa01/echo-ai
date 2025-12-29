import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";

const app = defineApp(); // Create the app configuration
app.use(agent); // Register the agent component

export default app;