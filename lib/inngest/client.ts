/**
 * Singleton Inngest client.
 *
 * The `id` must be stable across deployments — Inngest uses it to correlate
 * function registrations with the correct app in the cloud dashboard.
 * Import this client wherever you need to send events (`inngest.send(...)`)
 * or define background functions (`inngest.createFunction(...)`).
 */

import { Inngest } from "inngest"

export const inngest = new Inngest({ id: "edumotion-app" })
