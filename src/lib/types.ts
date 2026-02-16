export interface Priest {
  id: string
  name: string
  phone_number: string
  ordination_date: string | null
  times_served: number
  is_active: boolean
  created_at: string
  last_served_date: string | null
}

export interface Schedule {
  id: string
  service_date: string
  priest_ids: string[]
  status: 'in_progress' | 'confirmed'
  created_at: string
}

export interface ResponseLog {
  id: string
  priest_id: string
  schedule_id: string
  message_sent: string
  response: 'yes' | 'no' | 'no_response' | 'pending'
  response_received_at: string | null
}
