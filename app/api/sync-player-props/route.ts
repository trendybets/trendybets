export async function POST() {
  try {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    // Clean up old odds
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    await supabase
      .from("player_odds")
      .delete()
      .lt('created_at', todayStart.toISOString())

    // Get active fixtures
    const { data: fixtures, error: fixturesError } = await supabase
      .from("fixtures")
      .select("*")
      .eq('status', 'unplayed')
      .gte('start_date', todayStart.toISOString())

    if (fixturesError) throw fixturesError

    let successCount = 0
    const errors: any[] = []

    for (const fixture of fixtures) {
      try {
        const props = await fetchPlayerProps(fixture.id)
        
        // Batch upsert props with timestamp
        const propsToUpsert = props.map(prop => ({
          ...prop,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        const { error: upsertError } = await supabase
          .from("player_odds")
          .upsert(propsToUpsert, {
            onConflict: 'fixture_id,player_id,market_id,sportsbook',
            ignoreDuplicates: false
          })

        if (upsertError) throw upsertError
        successCount++
      } catch (error) {
        console.error(`Error syncing props for fixture ${fixture.id}:`, error)
        errors.push({ fixture_id: fixture.id, error })
      }
    }

    // Log sync completion
    await supabase
      .from("sync_log")
      .insert([{
        sync_type: 'player_odds',
        success_count: successCount,
        error_count: errors.length,
        errors: errors,
        completed_at: new Date().toISOString()
      }])

    return NextResponse.json({
      message: `Props sync completed: ${successCount} fixtures processed`,
      errors
    })

  } catch (error) {
    console.error("Props sync error:", error)
    return NextResponse.json({ error: "Props sync failed" }, { status: 500 })
  }
} 