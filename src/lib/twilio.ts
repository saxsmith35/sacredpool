import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID!
const authToken = process.env.TWILIO_AUTH_TOKEN!
const fromNumber = process.env.TWILIO_PHONE_NUMBER!

const client = twilio(accountSid, authToken)

export async function sendSMS(to: string, body: string) {
  try {
    const message = await client.messages.create({ body, from: fromNumber, to })
    console.log(`SMS sent to ${to}: ${message.sid}`)
    return { success: true, sid: message.sid }
  } catch (error) {
    console.error(`SMS failed to ${to}:`, error)
    return { success: false, error }
  }
}
