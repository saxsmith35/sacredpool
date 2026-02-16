import { checkNoResponses } from '@/lib/scheduling'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await checkNoResponses()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Check responses cron error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
