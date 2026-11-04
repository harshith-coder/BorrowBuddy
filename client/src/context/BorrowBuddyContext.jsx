import { useCallback, useEffect, useState } from 'react'
import BorrowBuddyContextValue from './BorrowBuddyContextValue'
import { apiRequest } from '../services/apiClient'

const emptyGroupData = {
  group: null,
  members: [],
  items: [],
  loans: [],
  source: 'api',
}

export function BorrowBuddyProvider({ user, children }) {
  const [groupData, setGroupData] = useState(emptyGroupData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshInventory = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [itemsData, loansData] = await Promise.all([
        apiRequest('/items'),
        apiRequest('/loans'),
      ])
      const loans = loansData.data || []
      setGroupData(current => ({
        ...current,
        items: itemsData.data || [],
        loans,
        source: 'api',
      }))
    } catch (loadError) {
      setGroupData(current => ({ ...current, items: [], loans: [], source: 'api' }))
      setError(loadError.message || 'Could not load inventory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) refreshInventory()
  }, [user, refreshInventory])

  const addItem = async values => {
    await apiRequest('/items', {
      method: 'POST',
      body: JSON.stringify({
        name: values.name,
        category: values.category,
        description: values.description,
        sharingType: 'all',
      }),
    })
    await refreshInventory()
  }

  const updateItem = async (itemId, values) => {
    await apiRequest(`/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: values.name,
        category: values.category,
        description: values.description,
      }),
    })
    await refreshInventory()
  }

  const deleteItem = async itemId => {
    await apiRequest(`/items/${itemId}`, { method: 'DELETE' })
    await refreshInventory()
  }

  const requestBorrow = async values => {
    const data = await apiRequest('/loans', {
      method: 'POST',
      body: JSON.stringify(values),
    })
    await refreshInventory()
    return data.data
  }

  const respondToRequest = async (requestId, decision) => {
    await apiRequest(`/loans/${requestId}/${decision === 'approved' ? 'approve' : 'reject'}`, {
      method: 'PATCH',
    })
    await refreshInventory()
  }

  const returnLoan = async (loanId, returnDate, note) => {
    await apiRequest(`/loans/${loanId}/return`, {
      method: 'PATCH',
      body: JSON.stringify({ returnDate, note }),
    })
    await refreshInventory()
  }

  const currentMemberId = user?._id || user?.id || ''
  const currentMember = user || null
  const requests = groupData.loans

  const value = {
    groupData,
    requests,
    currentMemberId,
    currentMember,
    loading,
    error,
    refreshInventory,
    addItem,
    updateItem,
    deleteItem,
    requestBorrow,
    respondToRequest,
    returnLoan,
  }
  return <BorrowBuddyContextValue.Provider value={value}>{children}</BorrowBuddyContextValue.Provider>
}
