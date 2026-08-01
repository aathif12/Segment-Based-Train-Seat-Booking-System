import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export const setAuthCredentials = (username?: string, password?: string) => {
  if (username && password) {
    const token = btoa(`${username}:${password}`)
    api.defaults.headers.common['Authorization'] = `Basic ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

export const setBearerToken = (token?: string) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common['Authorization']
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Station {
  id: number
  name: string
  code: string
  order_in_route: number
  distance_km: number
}

export interface Coach {
  id: number
  name: string
  type: 'RESERVED' | 'UNRESERVED'
  total_seats: number
}

export interface Seat {
  id: number
  coach_id: number
  seat_number: string
  coach: Coach
}

export interface AvailableSeat extends Seat {
  is_available: boolean
  fare: number
}

export interface Booking {
  id: number
  seat_id: number
  passenger_name: string
  passenger_email: string
  start_station_order: number
  end_station_order: number
  start_station_id: number
  end_station_id: number
  fare: number
  status: 'CONFIRMED' | 'CANCELLED' | 'WAITLISTED' | 'CANCEL_REQUESTED' | 'REFUNDED' | 'RESCHEDULED'
  travel_date: string
  created_at: string
  seat: Seat
  start_station: Station
  end_station: Station
}

export interface WaitlistEntry {
  id: number
  seat_id: number
  passenger_name: string
  passenger_email: string
  start_station_order: number
  end_station_order: number
  start_station_id: number
  end_station_id: number
  status: 'WAITLISTED' | 'CONFIRMED'
  travel_date: string
  created_at: string
  seat: Seat
  start_station: Station
  end_station: Station
}

export interface User {
  id: number
  name: string
  email: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface BookingRequest {
  seat_id: number
  passenger_name: string
  passenger_email: string
  travel_date: string
  start_station_id: number
  end_station_id: number
}

export interface CoachOccupancy {
  coach_id: number
  coach_name: string
  total_seats: number
  active_bookings: number
}

export interface RevenueRecord {
  start_station_name: string
  end_station_name: string
  total_revenue: number
  booking_count: number
}

// ── API Functions ────────────────────────────────────────────────────────────

export const fetchStations = () =>
  api.get<{ data: Station[] }>('/stations').then(r => r.data.data)

export const fetchAvailableSeats = (fromOrder: number, toOrder: number, date: string) =>
  api.get<{ data: AvailableSeat[] }>(`/seats/available?from_order=${fromOrder}&to_order=${toOrder}&date=${date}`)
     .then(r => r.data.data)

export const createBooking = (req: BookingRequest) =>
  api.post<{ data: Booking; message: string }>('/bookings', req).then(r => r.data)

export const cancelUserBooking = (id: number) =>
  api.delete<{ message: string }>(`/user/bookings/${id}`).then(r => r.data)

export const fetchBooking = (id: number) =>
  api.get<{ data: Booking }>(`/bookings/${id}`).then(r => r.data.data)

export const addToWaitlist = (req: BookingRequest) =>
  api.post<{ data: unknown; message: string }>('/bookings/waitlist', req).then(r => r.data)

// User APIs
export const registerUser = (data: any) => 
  api.post<AuthResponse>('/auth/register', data).then(r => r.data)

export const loginUser = (data: any) => 
  api.post<AuthResponse>('/auth/login', data).then(r => r.data)

export const fetchUserBookings = () => 
  api.get<{ data: Booking[] }>('/user/bookings').then(r => r.data.data)

// Admin APIs
export const fetchOccupancy = () =>
  api.get<{ data: CoachOccupancy[] }>('/admin/occupancy').then(r => r.data.data)

export const fetchRevenue = () =>
  api.get<{ data: RevenueRecord[] }>('/admin/revenue').then(r => r.data.data)

export const fetchBookings = () =>
  api.get<{ data: Booking[] }>('/admin/bookings').then(r => r.data.data)

export const fetchWaitlist = () =>
  api.get<{ data: WaitlistEntry[] }>('/admin/waitlist').then(r => r.data.data)

export const adminCancelBooking = (id: number) =>
  api.delete<{ message: string }>(`/admin/bookings/${id}`).then(r => r.data)

export const processCancellation = (id: number, action: 'refund' | 'reschedule') =>
  api.post<{ message: string }>(`/admin/bookings/${id}/process`, { action }).then(r => r.data)

export default api
