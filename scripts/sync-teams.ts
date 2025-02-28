import { syncTeams } from "../lib/sync"

async function runSync() {
  console.log("Starting team sync...")
  const result = await syncTeams()
  console.log(result.message)
  process.exit(0)
}

runSync().catch((error) => {
  console.error("Error running sync:", error)
  process.exit(1)
})

