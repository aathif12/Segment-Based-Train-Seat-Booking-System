import React, { createContext, useContext, useState } from 'react'
import { setBearerToken } from '../api/client'
import type { User } from '../api/client'

interface AuthContextType {
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType>({} as any)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (saved && token) {
      setBearerToken(token)
      return JSON.parse(saved)
    }
    return null
  })

  const login = (token: string, u: User) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(u))
    setBearerToken(token)
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setBearerToken(undefined)
    setUser(null)
  }

  const updateUser = (u: User) => {
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
