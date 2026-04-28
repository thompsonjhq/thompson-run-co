module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { week_num, day_name, detail, dot, distance_km, reason } = req.body;
  if (!week_num || !day_name || !detail) {
    return res.status(400).json({ error: 'week_num, day_name, and detail are required' });
  }

  try {
    const res2 = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/plan_sessions?week_num=eq.${week_num}&day_name=eq.${day_name}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          detail,
          dot: dot || 'easy',
          distance_km: distance_km || null,
          is_modified: true,
          modification_reason: reason || null,
          modified_by: 'coach'
        })
      }
    );
    const data = await res2.text();
    if (!res2.ok) return res.status(500).json({ error: data });
    res.status(200).json({ success: true, updated: JSON.parse(data) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
