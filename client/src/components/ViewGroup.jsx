import { useEffect, useMemo, useState } from 'react'
import GroupIcon from './GroupIcon'
import MemberAccordion from './MemberAccordion'
import BorrowItemModal from './BorrowItemModal'
import BorrowItemForm from './BorrowItemForm'
import BorrowedItems from './BorrowedItems'
import ReturnItemForm from './ReturnItemForm'
import { loadGroupData } from '../services/groupDataService'
import { API_BASE } from '../config/api'
import './ViewGroup.css'

const getId = value => String(value?._id || value?.id || value || '')
const ownerIdFor = (item, group) => getId(item.ownerId || group?.ownerId)

function ViewGroup({ groupId, group, onBack }) {
  const [data, setData] = useState({ members: [], items: [], loans: [] })
  const [activeTab, setActiveTab] = useState('members')
  const [expandedMemberId, setExpandedMemberId] = useState('rahul')
  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalMemberId, setModalMemberId] = useState('')
  const [selectedItemId, setSelectedItemId] = useState('')
  const [pendingBorrow, setPendingBorrow] = useState(null)
  const [returningLoan, setReturningLoan] = useState(null)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const token = localStorage.getItem('token')
  let storedUser = null
  try { storedUser = JSON.parse(localStorage.getItem('user') || 'null') } catch { /* Use the guest label if saved user data is malformed. */ }
  const borrowerName = storedUser?.name || 'You'
  const borrowerId = storedUser?._id || storedUser?.id || 'current-user'

  const refreshData = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await loadGroupData(group || { _id: groupId, name: 'friends' }, token)
      setData(result)
      setExpandedMemberId(current => result.members.some(member => getId(member) === current)
        ? current
        : (result.members.find(member => member.id === 'rahul')?._id || result.members[0]?._id || result.members[0]?.id || ''))
    } catch (loadError) {
      setError(loadError.message || 'Could not load group details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetching data from the service is the synchronization this effect owns.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData()
  }, [groupId]) // eslint-disable-line react-hooks/exhaustive-deps

  const itemsForMember = member => data.items.filter(item => ownerIdFor(item, group) === getId(member))
  const visibleMembers = useMemo(() => data.members.filter(member => {
    const matchesName = (member.name || '').toLowerCase().includes(search.toLowerCase())
    const memberItems = data.items.filter(item => ownerIdFor(item, group) === getId(member))
    const matchesAvailability = availability === 'all' || memberItems.some(item => item.status === availability)
    return matchesName && matchesAvailability
  }), [data.members, data.items, search, availability, group])
  const activeLoans = data.loans.filter(loan => ['active', 'overdue'].includes(loan.status))
  const returnedLoans = data.loans.filter(loan => loan.status === 'returned')
  const modalMember = data.members.find(member => getId(member) === modalMemberId)
  const modalItems = modalMember ? itemsForMember(modalMember) : []
  const selectedItem = modalItems.find(item => getId(item) === selectedItemId && item.status === 'available')

  const openBorrowModal = member => {
    setModalMemberId(getId(member))
    setSelectedItemId('')
    setPendingBorrow(null)
    setFormError('')
  }

  const continueBorrow = () => {
    if (!selectedItem || !modalMember) return
    setPendingBorrow({ item: selectedItem, owner: modalMember })
    setModalMemberId('')
    setFormError('')
  }

  const submitBorrow = async borrowDetails => {
    if (!pendingBorrow || pendingBorrow.item.status !== 'available') return
    setBusy(true)
    setFormError('')
    try {
      let loan
      if (data.source === 'mock') {
        loan = {
          _id: `friends-loan-${Date.now()}`,
          itemId: pendingBorrow.item._id,
          borrowerId,
          checkoutDate: borrowDetails.checkoutDate,
          dueDate: borrowDetails.returnDate,
          status: 'active',
        }
      } else {
        const response = await fetch(`${API_BASE}/groups/${groupId}/loans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            itemId: pendingBorrow.item._id,
            checkoutDate: borrowDetails.checkoutDate,
            dueDate: borrowDetails.returnDate,
            note: borrowDetails.purpose,
          }),
        })
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.message || 'Borrow request failed')
        loan = result.data
      }
      const newLoan = {
        ...loan,
        _id: loan?._id || `borrow-${Date.now()}`,
        itemId: loan?.itemId || pendingBorrow.item._id,
        itemName: pendingBorrow.item.name,
        ownerId: getId(pendingBorrow.owner),
        ownerName: pendingBorrow.owner.name,
        borrowerId: loan?.borrowerId || borrowerId,
        borrowerName: borrowerName,
        checkoutDate: loan?.checkoutDate || borrowDetails.checkoutDate,
        dueDate: loan?.dueDate || borrowDetails.returnDate,
        durationDays: borrowDetails.durationDays,
        purpose: borrowDetails.purpose,
        note: borrowDetails.purpose,
        status: loan?.status || 'active',
      }
      setData(current => ({
        ...current,
        items: current.items.map(item => getId(item) === getId(pendingBorrow.item) ? { ...item, status: 'borrowed' } : item),
        loans: [newLoan, ...current.loans],
      }))
      setPendingBorrow(null)
      setActiveTab('members')
      setNotice(`${pendingBorrow.item.name} borrow request submitted successfully.`)
      window.setTimeout(() => setNotice(''), 4500)
    } catch (submitError) {
      setFormError(submitError.message || 'Borrow request failed')
    } finally {
      setBusy(false)
    }
  }

  const beginReturn = loan => {
    const itemValue = loan.itemId
    const item = typeof itemValue === 'object'
      ? itemValue
      : data.items.find(candidate => getId(candidate) === getId(itemValue))
    const owner = item ? memberForItem(item) : null
    if (!item) {
      setError('The item for this loan could not be loaded.')
      return
    }
    setError('')
    setFormError('')
    setReturningLoan({ loan, item, owner: owner || { name: 'Group member' } })
  }

  const submitReturn = async ({ returnDate, note }) => {
    if (!returningLoan || !['active', 'overdue'].includes(returningLoan.loan.status)) return
    setBusy(true)
    setFormError('')
    try {
      let updatedLoan
      if (data.source === 'mock') {
        updatedLoan = { status: 'returned', returnDate, returnNote: note }
      } else {
        const response = await fetch(`${API_BASE}/loans/${getId(returningLoan.loan)}/return`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ returnDate, note }),
        })
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.message || 'Could not return item')
        updatedLoan = result.data
      }
      setData(current => ({
        ...current,
        items: current.items.map(item => getId(item) === getId(returningLoan.item) ? { ...item, status: 'available' } : item),
        loans: current.loans.map(loan => getId(loan) === getId(returningLoan.loan)
          ? { ...loan, ...updatedLoan, itemId: loan.itemId, borrowerId: loan.borrowerId }
          : loan),
      }))
      setReturningLoan(null)
      setActiveTab('returned')
      setNotice(`${returningLoan.item.name} was returned successfully.`)
      window.setTimeout(() => setNotice(''), 4500)
    } catch (returnError) {
      setFormError(returnError.message || 'Could not return item')
    } finally {
      setBusy(false)
    }
  }

  function memberForItem(item) {
    return data.members.find(member => getId(member) === ownerIdFor(item, group))
  }

  if (returningLoan) return <ReturnItemForm
    key={getId(returningLoan.loan)}
    item={returningLoan.item}
    owner={returningLoan.owner}
    onCancel={() => { setReturningLoan(null); setFormError('') }}
    onSubmit={submitReturn}
    busy={busy}
    error={formError}
  />

  if (pendingBorrow) return <BorrowItemForm
    key={getId(pendingBorrow.item)}
    item={pendingBorrow.item}
    owner={pendingBorrow.owner}
    borrowerName={borrowerName}
    onCancel={() => { setPendingBorrow(null); setFormError('') }}
    onSubmit={submitBorrow}
    busy={busy}
    error={formError}
  />

  return (
    <section className="view-group-page">
      <header className="view-group-header">
        <button className="view-group-back" type="button" onClick={onBack} aria-label="Back to groups"><GroupIcon name="back" /></button>
        <h1>View Group</h1>
      </header>
      <div className="view-group-body">
        <section className="view-group-summary">
          <div className="view-group-summary-main"><span className="view-group-people-icon"><GroupIcon name="people" /></span>
            <div><h2>{group?.name || 'Friends'}</h2><p>{data.members.length} {data.members.length === 1 ? 'member' : 'members'}</p></div>
          </div>
          <div className="view-group-summary-stats"><div className="view-group-summary-stat"><GroupIcon name="box" /><div><strong>{data.items.length}</strong><span>Total Items</span></div></div></div>
        </section>

        <nav className="view-group-tabs" aria-label="Group information">
          <button type="button" className={activeTab === 'members' ? 'active' : ''} onClick={() => setActiveTab('members')}><GroupIcon name="people" />Members</button>
          <button type="button" className={activeTab === 'borrowed' ? 'active' : ''} onClick={() => setActiveTab('borrowed')}><GroupIcon name="box" />Borrowed Items <span className="view-group-tab-count">{activeLoans.length}</span></button>
          <button type="button" className={activeTab === 'returned' ? 'active' : ''} onClick={() => setActiveTab('returned')}><GroupIcon name="box" />Return Items <span className="view-group-tab-count">{returnedLoans.length}</span></button>
        </nav>

        {notice && <div className="view-group-success" role="status">{notice}</div>}
        {error && <div className="view-group-message" role="alert">{error}<button type="button" onClick={refreshData}>Retry</button></div>}
        {loading ? <div className="view-group-empty">Loading group details…</div> : activeTab === 'members' ? <>
          <div className="view-group-controls">
            <label className="view-group-search"><GroupIcon name="search" /><input type="search" placeholder="Search members..." value={search} onChange={event => setSearch(event.target.value)} /></label>
            <label className="view-group-category"><GroupIcon name="box" /><select value={availability} onChange={event => setAvailability(event.target.value)}><option value="all">All Items</option><option value="available">Available Items</option><option value="borrowed">Borrowed Items</option></select><GroupIcon name="chevron" /></label>
          </div>
          <div className="view-group-member-list">
            {visibleMembers.length ? visibleMembers.map(member => <MemberAccordion
              key={getId(member)}
              member={member}
              items={itemsForMember(member)}
              expanded={getId(member) === expandedMemberId}
              onToggle={() => setExpandedMemberId(getId(member) === expandedMemberId ? '' : getId(member))}
              onBorrow={() => openBorrowModal(member)}
            />) : <div className="view-group-empty">No matching members.</div>}
          </div>
        </> : <BorrowedItems
          loans={activeTab === 'borrowed' ? activeLoans : returnedLoans}
          items={data.items}
          members={data.members}
          mode={activeTab === 'borrowed' ? 'active' : 'returned'}
          onReturn={beginReturn}
        />}
      </div>

      {modalMember && <BorrowItemModal
        member={modalMember}
        items={modalItems}
        selectedItemId={selectedItemId}
        onSelect={setSelectedItemId}
        onClose={() => setModalMemberId('')}
        onContinue={continueBorrow}
      />}
    </section>
  )
}

export default ViewGroup
