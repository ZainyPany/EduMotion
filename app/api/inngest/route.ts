import { serve } from "inngest/next";
import { inngest } from "../../../lib/inngest/client";
import { processMaterial } from "../../../lib/inngest/functions";

// Create an API that serves zero-dependency functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processMaterial,
  ],
});
