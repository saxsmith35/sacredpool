import { supabaseAdmin } from './supabase'
import { sendSMS } from './twilio'

function getNextSunday(): string {
  const now = new Date()
  const day = now.getDay()
  const daysUntilSunday = day === 0 ? 7 : 7 - day
  const sunday = new Date(now)
  sunday.setDate(now.getDate() + daysUntilSunday)
  return sunday.toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export async function startWeeklyCycle() {
  const serviceDate = getNextSunday()

  // Check if schedule already exists
  const { data: existing } = await supabaseAdmin
    .from('schedules')
    .select('*')
    .eq('service_date', serviceDate)
    .single()

  if (existing) {
    console.log(`Schedule already exists for ${serviceDate}`)
    return { message: 'Schedule already exists', schedule: existing }
  }

  // Create new schedule
  const { data: schedule, error: schedError } = await supabaseAdmin
    .from('schedules')
    .insert({ service_date: serviceDate, priest_ids: [], status: 'in_progress' })
    .select()
    .single()

  if (schedError) throw schedError

  // Get priest queue sorted by last_served_date (oldest first), randomize ties
  const { data: priests } = await supabaseAdmin
    .from('priests')
    .select('*')
    .eq('is_active', true)
    .order('last_served_date', { ascending: true, nullsFirst: true })
    .order('times_served', { ascending: true })

  if (!priests || priests.length === 0) {
    return { message: 'No active priests available', schedule }
  }

  // Contact first 3
  const toContact = priests.slice(0, 3)
  const dateFormatted = formatDate(serviceDate)

  for (const priest of toContact) {
    const msg = `Hi ${priest.name}! You're scheduled to bless the sacrament this Sunday, ${dateFormatted} at 8:50 AM. Can you make it? Reply YES or NO. (If we don't hear from you in 24 hours, we'll ask someone else.)`

    await supabaseAdmin.from('response_log').insert({
      priest_id: priest.id,
      schedule_id: schedule.id,
      message_sent: new Date().toISOString(),
      response: 'pending',
    })

    await sendSMS(priest.phone_number, msg)
  }

  return { message: `Contacted ${toContact.length} priests for ${serviceDate}`, schedule }
}

export async function handleSMSResponse(from: string, body: string) {
  const normalized = body.trim().toLowerCase()
  let response: 'yes' | 'no'

  if (['yes', 'y'].includes(normalized)) {
    response = 'yes'
  } else if (['no', 'n'].includes(normalized)) {
    response = 'no'
  } else {
    await sendSMS(from, 'Please reply YES or NO')
    return { action: 'invalid_response' }
  }

  // Find priest by phone
  const { data: priest } = await supabaseAdmin
    .from('priests')
    .select('*')
    .eq('phone_number', from)
    .single()

  if (!priest) return { action: 'unknown_number' }

  // Find their pending response log
  const { data: log } = await supabaseAdmin
    .from('response_log')
    .select('*, schedules(*)')
    .eq('priest_id', priest.id)
    .eq('response', 'pending')
    .order('message_sent', { ascending: false })
    .limit(1)
    .single()

  if (!log) return { action: 'no_pending_request' }

  // Update response
  await supabaseAdmin
    .from('response_log')
    .update({ response, response_received_at: new Date().toISOString() })
    .eq('id', log.id)

  const scheduleId = log.schedule_id

  if (response === 'yes') {
    // Add to confirmed list
    const { data: schedule } = await supabaseAdmin
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .single()

    if (schedule) {
      const priestIds = [...(schedule.priest_ids || []), priest.id]
      const status = priestIds.length >= 3 ? 'confirmed' : 'in_progress'
      await supabaseAdmin
        .from('schedules')
        .update({ priest_ids: priestIds, status })
        .eq('id', scheduleId)

      await sendSMS(from, `Thanks ${priest.name}! You're confirmed for Sunday. We'll send a reminder Saturday.`)
    }
  } else {
    // NO - contact next in queue
    await sendSMS(from, `No problem, ${priest.name}. Thanks for letting us know!`)
    await contactNextPriest(scheduleId)
  }

  return { action: response, priest: priest.name }
}

async function contactNextPriest(scheduleId: string) {
  const { data: schedule } = await supabaseAdmin
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .single()

  if (!schedule || schedule.status === 'confirmed') return

  // Get already contacted priests for this schedule
  const { data: contacted } = await supabaseAdmin
    .from('response_log')
    .select('priest_id')
    .eq('schedule_id', scheduleId)

  const contactedIds = (contacted || []).map(c => c.priest_id)

  // Get next available priest
  const { data: priests } = await supabaseAdmin
    .from('priests')
    .select('*')
    .eq('is_active', true)
    .not('id', 'in', `(${contactedIds.join(',')})`)
    .order('last_served_date', { ascending: true, nullsFirst: true })
    .order('times_served', { ascending: true })
    .limit(1)

  if (!priests || priests.length === 0) {
    console.log('Queue exhausted for schedule', scheduleId)
    return
  }

  const priest = priests[0]
  const dateFormatted = formatDate(schedule.service_date)
  const msg = `Hi ${priest.name}! You're scheduled to bless the sacrament this Sunday, ${dateFormatted} at 8:50 AM. Can you make it? Reply YES or NO. (If we don't hear from you in 24 hours, we'll ask someone else.)`

  await supabaseAdmin.from('response_log').insert({
    priest_id: priest.id,
    schedule_id: scheduleId,
    message_sent: new Date().toISOString(),
    response: 'pending',
  })

  await sendSMS(priest.phone_number, msg)
}

export async function checkNoResponses() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: expired } = await supabaseAdmin
    .from('response_log')
    .select('*, schedules(*)')
    .eq('response', 'pending')
    .lt('message_sent', twentyFourHoursAgo)

  if (!expired) return

  for (const log of expired) {
    await supabaseAdmin
      .from('response_log')
      .update({ response: 'no_response', response_received_at: new Date().toISOString() })
      .eq('id', log.id)

    if (log.schedules?.status !== 'confirmed') {
      await contactNextPriest(log.schedule_id)
    }
  }
}

export async function sendThursdayCheckins() {
  const serviceDate = getNextSunday()

  const { data: schedule } = await supabaseAdmin
    .from('schedules')
    .select('*')
    .eq('service_date', serviceDate)
    .single()

  if (!schedule) return

  for (const priestId of (schedule.priest_ids || [])) {
    const { data: priest } = await supabaseAdmin
      .from('priests')
      .select('*')
      .eq('id', priestId)
      .single()

    if (priest) {
      await sendSMS(
        priest.phone_number,
        `Hi ${priest.name}, just checking in - still good for blessing the sacrament Sunday at 8:50 AM? Reply YES to confirm or NO if plans changed.`
      )

      await supabaseAdmin.from('response_log').insert({
        priest_id: priest.id,
        schedule_id: schedule.id,
        message_sent: new Date().toISOString(),
        response: 'pending',
      })
    }
  }
}

export async function sendSaturdayReminders() {
  const serviceDate = getNextSunday()

  const { data: schedule } = await supabaseAdmin
    .from('schedules')
    .select('*')
    .eq('service_date', serviceDate)
    .single()

  if (!schedule || !schedule.priest_ids?.length) return

  const { data: priests } = await supabaseAdmin
    .from('priests')
    .select('*')
    .in('id', schedule.priest_ids)

  if (!priests) return

  const dateFormatted = formatDate(serviceDate)

  for (const priest of priests) {
    const others = priests.filter(p => p.id !== priest.id).map(p => p.name)
    const othersStr = others.join(' and ')
    await sendSMS(
      priest.phone_number,
      `Reminder: Tomorrow (Sunday ${dateFormatted}) you're blessing the sacrament at 8:50 AM with ${othersStr}. See you there!`
    )
  }

  // Mark service complete - update stats
  for (const priest of priests) {
    await supabaseAdmin
      .from('priests')
      .update({
        last_served_date: serviceDate,
        times_served: (priest.times_served || 0) + 1,
      })
      .eq('id', priest.id)
  }
}
