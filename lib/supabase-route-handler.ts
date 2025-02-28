import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

let routeHandlerClient: ReturnType<typeof createRouteHandlerClient<Database>> | null = null

export function createRouteHandler() {
  if (!routeHandlerClient) {
    routeHandlerClient = createRouteHandlerClient<Database>({ cookies })
  }
  return routeHandlerClient
}

