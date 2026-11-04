import { useContext } from 'react'
import BorrowBuddyContextValue from './BorrowBuddyContextValue'

export function useBorrowBuddy() {
  const context = useContext(BorrowBuddyContextValue)
  if (!context) throw new Error('useBorrowBuddy must be used inside BorrowBuddyProvider')
  return context
}
