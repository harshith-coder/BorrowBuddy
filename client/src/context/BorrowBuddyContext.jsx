import { useEffect, useState } from 'react'
import { createMockGroupData } from '../data/mockGroupData'
import BorrowBuddyContextValue from './BorrowBuddyContextValue'

const STORAGE_KEY = 'borrowbuddy-shared-friends-group-v1'

function createInitialData(user) {
  let saved = null
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { /* Fall back to the established Friends Group mock data. */ }
  const workspace = saved?.groupData?.members && Array.isArray(saved.requests)
    ? saved
    : { groupData: createMockGroupData({ _id: 'friends-group', name: 'Friends Group' }), requests: [] }
  workspace.groupData.items = workspace.groupData.items.map(item => ({
    ...item,
    description: item.description || '',
    dateAdded: item.dateAdded || item.createdAt || new Date().toISOString(),
  }))
  const member = workspace.groupData.members.find(candidate =>
    (user?.email && candidate.email?.toLowerCase() === user.email.toLowerCase()) ||
    (user?.name && candidate.name?.toLowerCase() === user.name.toLowerCase())
  ) || workspace.groupData.members.find(candidate => candidate.id === 'rahul')
  if (member && user?.name && member.name.toLowerCase() !== user.name.toLowerCase()) {
    member.name = user.name
    member.email = user.email || member.email
    workspace.groupData.loans = workspace.groupData.loans.map(loan => ({
      ...loan,
      ...(loan.ownerId === member.id ? { ownerName: member.name } : {}),
      ...(loan.borrowerId === member.id ? { borrowerName: member.name } : {}),
    }))
  }
  return workspace
}

export function BorrowBuddyProvider({ user, children }) {
  const [workspace, setWorkspace] = useState(() => createInitialData(user))
  const matchedMember = workspace.groupData.members.find(member =>
    (user?.email && member.email?.toLowerCase() === user.email.toLowerCase()) ||
    (user?.name && member.name?.toLowerCase() === user.name.toLowerCase())
  )
  const currentMemberId = matchedMember?.id || 'rahul'
  const currentMember = workspace.groupData.members.find(member => member.id === currentMemberId)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
  }, [workspace])

  const addItem = values => setWorkspace(current => ({
    ...current,
    groupData: { ...current.groupData, items: [{
      _id: `friends-item-${Date.now()}`,
      ownerId: currentMemberId,
      ...values,
      status: values.status.toLowerCase(),
      dateAdded: new Date().toISOString(),
    }, ...current.groupData.items] },
  }))

  const updateItem = (itemId, values) => setWorkspace(current => ({
    ...current,
    groupData: { ...current.groupData, items: current.groupData.items.map(item =>
      item._id === itemId && item.ownerId === currentMemberId ? { ...item, ...values } : item
    ) },
  }))

  const deleteItem = itemId => setWorkspace(current => ({
    ...current,
    groupData: { ...current.groupData, items: current.groupData.items.filter(item => item._id !== itemId || item.ownerId !== currentMemberId) },
  }))

  const requestBorrow = request => setWorkspace(current => ({ ...current, requests: [request, ...current.requests] }))

  const respondToRequest = (requestId, decision) => setWorkspace(current => {
    const request = current.requests.find(entry => entry._id === requestId && entry.status === 'pending')
    if (!request) return current
    const item = current.groupData.items.find(entry => entry._id === request.itemId)
    if (decision === 'approved' && (!item || item.status !== 'available' || current.groupData.loans.some(loan => String(loan.itemId?._id || loan.itemId) === request.itemId && ['active', 'overdue'].includes(loan.status)))) {
      return { ...current, requests: current.requests.map(entry => entry._id === requestId ? { ...entry, status: 'rejected', respondedAt: new Date().toISOString(), responseMessage: 'This item is no longer available.' } : entry) }
    }
    const requests = current.requests.map(entry => entry._id === requestId ? { ...entry, status: decision, respondedAt: new Date().toISOString() } : entry)
    if (decision !== 'approved') return { ...current, requests }
    const loan = {
      _id: `friends-loan-${Date.now()}`,
      itemId: request.itemId,
      itemName: item.name,
      ownerId: item.ownerId,
      ownerName: current.groupData.members.find(member => member.id === item.ownerId)?.name || 'Group member',
      borrowerId: request.borrowerId,
      borrowerName: request.borrowerName,
      checkoutDate: request.checkoutDate,
      dueDate: request.returnDate,
      durationDays: request.durationDays,
      note: request.purpose || '',
      status: 'active',
    }
    return {
      ...current,
      requests,
      groupData: {
        ...current.groupData,
        items: current.groupData.items.map(entry => entry._id === item._id ? { ...entry, status: 'borrowed' } : entry),
        loans: [loan, ...current.groupData.loans],
      },
    }
  })

  const returnMockLoan = (loanId, returnDate, note) => setWorkspace(current => {
    const loan = current.groupData.loans.find(entry => entry._id === loanId && ['active', 'overdue'].includes(entry.status))
    if (!loan) return current
    return {
      ...current,
      groupData: {
        ...current.groupData,
        items: current.groupData.items.map(item => String(item._id) === String(loan.itemId?._id || loan.itemId) ? { ...item, status: 'available' } : item),
        loans: current.groupData.loans.map(entry => entry._id === loanId ? { ...entry, status: 'returned', returnDate, returnNote: note } : entry),
      },
    }
  })

  const value = { groupData: workspace.groupData, requests: workspace.requests, currentMemberId, currentMember, addItem, updateItem, deleteItem, requestBorrow, respondToRequest, returnMockLoan }
  return <BorrowBuddyContextValue.Provider value={value}>{children}</BorrowBuddyContextValue.Provider>
}
