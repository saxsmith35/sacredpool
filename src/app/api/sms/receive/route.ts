import { handleSMSResponse } from '@/lib/scheduling'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const from = formData.get('From') as string
  const body = formData.get('Body') as string

  console.log(`SMS received from ${from}: ${body}`)

  try {
    const result = await handleSMSResponse(from, body)
    console.log('SMS response handled:', result)
  } catch (error) {
    console.error('Error handling SMS:', error)
  }

  // Return TwiML empty response
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { 'Content-Type': 'text/xml' } }
  )
}
