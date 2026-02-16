import { startWeeklyCycle } from '@/lib/scheduling'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await startWeeklyCycle()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Monday cron error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
