import { useEffect, useMemo, useState } from 'react'
import GroupIcon from './GroupIcon'
import MemberAccordion from './MemberAccordion'
import BorrowItemModal from './BorrowItemModal'
import BorrowItemForm from './BorrowItemForm'
import BorrowedItems from './BorrowedItems'
import ReturnItemForm from './ReturnItemForm'
import { loadGroupData } from '../services/groupDataService'
import { apiRequest, getAssetUrl } from '../services/apiClient'
import './ViewGroup.css'

const getId = value => String(value?._id || value?.id || value || '')
const ownerIdFor = (item, group) => getId(item.ownerId || group?.ownerId)

function ViewGroup({ groupId, group, onBack, onDeleteGroup }) {
  const [data, setData] = useState({ members: [], items: [], loans: [] })
  const [activeTab, setActiveTab] = useState('members')
  const [expandedMemberId, setExpandedMemberId] = useState('')
  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState('all')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalMemberId, setModalMemberId] = useState('')
  const [selectedItemId, setSelectedItemId] = useState('')
  const [pendingBorrow, setPendingBorrow] = useState(null)
  const [returningLoan, setReturningLoan] = useState(null)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteUsers, setInviteUsers] = useState([])
  const [inviteSearch, setInviteSearch] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const token = localStorage.getItem('token')
  let storedUser = null
  try { storedUser = JSON.parse(localStorage.getItem('user') || 'null') } catch { /* Use the guest label if saved user data is malformed. */ }
  const borrowerName = storedUser?.name || 'You'
  const borrowerId = storedUser?._id || storedUser?.id || 'current-user'
  const isOwner = getId(group?.ownerId) === String(borrowerId)

  const refreshData = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await loadGroupData(group || { _id: groupId }, token)
      setData(result)
      setExpandedMemberId(current => result.members.some(member => getId(member) === current)
        ? current
        : (result.members[0]?._id || result.members[0]?.id || ''))
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
  }, [groupId, group]) // eslint-disable-line react-hooks/exhaustive-deps

  const itemsForMember = member => data.items.filter(item => ownerIdFor(item, group) === getId(member))
  const visibleMembers = useMemo(() => data.members.filter(member => {
    const matchesName = (member.name || '').toLowerCase().includes(search.toLowerCase())
    const memberItems = data.items.filter(item => ownerIdFor(item, group) === getId(member))
    const matchesAvailability = availability === 'all' || memberItems.some(item => item.status === availability)
    return matchesName && matchesAvailability
  }), [data.members, data.items, search, availability, group])
  const activeLoans = data.loans.filter(loan => ['active', 'booked'].includes(loan.status))
  const modalMember = data.members.find(member => getId(member) === modalMemberId)
  const modalItems = modalMember ? itemsForMember(modalMember) : []
  const selectedItem = modalItems.find(item => getId(item) === selectedItemId && item.status === 'available')
  const visibleItems = useMemo(() => data.items.filter(item => {
    const matchesName = `${item.name || ''} ${item.category || ''}`.toLowerCase().includes(search.toLowerCase())
    return matchesName &&
      (availability === 'all' || item.status === availability) &&
      (category === 'all' || item.category === category)
  }), [data.items, search, availability, category])

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
      {
        const result = await apiRequest(`/groups/${groupId}/loans`, {
          method: 'POST',
          body: JSON.stringify({
            itemId: pendingBorrow.item._id,
            groupId,
            checkoutDate: borrowDetails.checkoutDate,
            dueDate: borrowDetails.returnDate,
            durationDays: borrowDetails.durationDays,
            note: borrowDetails.purpose,
          }),
        })
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
        status: loan?.status || 'requested',
      }
      setData(current => ({
        ...current,
        items: current.items.map(item => getId(item) === getId(pendingBorrow.item) ? { ...item, status: 'requested' } : item),
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
    if (!returningLoan || !['active', 'booked'].includes(returningLoan.loan.status)) return
    setBusy(true)
    setFormError('')
    try {
      await apiRequest(`/loans/${getId(returningLoan.loan)}/return`, {
        method: 'PATCH',
        body: JSON.stringify({ returnDate, note }),
      })
      await refreshData()
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

  const removeMember = async member => {
    if (!isOwner || getId(member) === String(borrowerId)) return
    if (!window.confirm(`Remove ${member.name || 'this member'} from the group?`)) return
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/groups/${groupId}/members/${getId(member)}`, { method: 'DELETE' })
      await refreshData()
      setNotice(`${member.name || 'Member'} was removed from the group.`)
    } catch (removeError) {
      setError(removeError.message || 'Could not remove member')
    } finally {
      setBusy(false)
    }
  }

  const leaveGroup = async () => {
    if (isOwner || !window.confirm('Leave this group?')) return
    setBusy(true)
    setError('')
    try {
      await apiRequest(`/groups/${groupId}/leave`, { method: 'PATCH' })
      onBack()
    } catch (leaveError) {
      setError(leaveError.message || 'Could not leave group')
      setBusy(false)
    }
  }

  const deleteGroup = async () => {
    if (!isOwner || !window.confirm(`Delete "${group?.name || 'this group'}"? This cannot be undone.`)) return
    setBusy(true)
    setError('')
    try {
      await onDeleteGroup(groupId)
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete group')
      setBusy(false)
    }
  }

  const openInviteModal = async () => {
    setInviteOpen(true)
    setInviteSearch('')
    setFormError('')
    try {
      const result = await apiRequest('/auth/users')
      const memberIds = new Set(data.members.map(member => getId(member)))
      setInviteUsers((result.data || []).filter(user => !memberIds.has(getId(user)) && getId(user) !== String(borrowerId)))
    } catch (inviteError) {
      setInviteOpen(false)
      setError(inviteError.message || 'Could not load users to invite')
    }
  }

  const sendInvitation = async user => {
    setInviteBusy(true)
    setFormError('')
    try {
      await apiRequest('/invitations', {
        method: 'POST',
        body: JSON.stringify({ groupId, inviteeId: getId(user) }),
      })
      setInviteOpen(false)
      setNotice(`Invitation sent to ${user.name || 'the user'}.`)
      window.setTimeout(() => setNotice(''), 4500)
    } catch (inviteError) {
      setFormError(inviteError.message || 'Could not send invitation')
    } finally {
      setInviteBusy(false)
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
            <div><h2>{group?.name || 'Group'}</h2><p>{loading ? 'Loading group data…' : `${data.members.length} ${data.members.length === 1 ? 'member' : 'members'} · Owner: ${group?.ownerId?.name || 'Group owner'}`}</p></div>
          </div>
          <div className="view-group-summary-actions">
            <button className="view-group-invite-action" type="button" onClick={openInviteModal} disabled={busy}>Invite Member</button>
            {!isOwner && <button className="view-group-borrow-item" type="button" onClick={leaveGroup} disabled={busy}>Leave Group</button>}
          </div>
          {isOwner && <button className="view-group-danger-action" type="button" onClick={deleteGroup} disabled={busy}>Delete Group</button>}
          <div className="view-group-summary-stats"><div className="view-group-summary-stat"><GroupIcon name="box" /><div><strong>{loading ? '—' : data.items.length}</strong><span>Total Items</span></div></div></div>
        </section>

        <nav className="view-group-tabs" aria-label="Group information">
          <button type="button" className={activeTab === 'members' ? 'active' : ''} onClick={() => setActiveTab('members')}><GroupIcon name="people" />Members</button>
          <button type="button" className={activeTab === 'items' ? 'active' : ''} onClick={() => setActiveTab('items')}><GroupIcon name="box" />Items <span className="view-group-tab-count">{loading ? '—' : data.items.length}</span></button>
          <button type="button" className={activeTab === 'borrowed' ? 'active' : ''} onClick={() => setActiveTab('borrowed')}><GroupIcon name="borrow" />Active Borrowings <span className="view-group-tab-count">{loading ? '—' : activeLoans.length}</span></button>
          <button type="button" className={activeTab === 'returned' ? 'active' : ''} onClick={() => setActiveTab('returned')}><GroupIcon name="box" />Return Items <span className="view-group-tab-count">{loading ? '—' : activeLoans.length}</span></button>
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
              canRemove={isOwner && getId(member) !== String(borrowerId)}
              onRemove={() => removeMember(member)}
            />) : <div className="view-group-empty">No matching members.</div>}
          </div>
        </> : activeTab === 'items' ? <>
          <div className="view-group-controls">
            <label className="view-group-search"><GroupIcon name="search" /><input type="search" placeholder="Search items..." value={search} onChange={event => setSearch(event.target.value)} /></label>
            <label className="view-group-category"><GroupIcon name="box" /><select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All Categories</option>{[...new Set(data.items.map(item => item.category).filter(Boolean))].sort().map(itemCategory => <option key={itemCategory} value={itemCategory}>{itemCategory}</option>)}</select><GroupIcon name="chevron" /></label>
            <label className="view-group-category"><GroupIcon name="box" /><select value={availability} onChange={event => setAvailability(event.target.value)}><option value="all">All Statuses</option><option value="available">Available Items</option><option value="requested">Requested Items</option><option value="booked">Booked Items</option><option value="borrowed">Borrowed Items</option></select><GroupIcon name="chevron" /></label>
          </div>
          <div className="view-group-overview-items">
            {visibleItems.length ? visibleItems.map(item => <article className="view-group-overview-item" key={item._id}>
              {item.imageUrl ? <img src={getAssetUrl(item.imageUrl)} alt="" /> : <span className="view-group-overview-item-icon"><GroupIcon name="box" /></span>}
              <div><strong>{item.name}</strong><span>{item.category || 'General'} · Owner: {item.ownerId?.name || memberForItem(item)?.name || 'Group member'}</span></div>
              <b className={`view-group-overview-status ${item.status}`}>{item.status}</b>
            </article>) : <div className="view-group-empty">No items shared with this group.</div>}
          </div>
        </> : <BorrowedItems
          loans={activeLoans}
          items={data.items}
          members={data.members}
          mode="active"
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
      {inviteOpen && <div className="view-group-invite-backdrop" role="dialog" aria-modal="true" aria-labelledby="invite-member-title">
        <section className="view-group-invite-modal">
          <div className="view-group-invite-header">
            <div><h2 id="invite-member-title">Invite a member</h2><p>They will join this group after accepting the invitation.</p></div>
            <button type="button" onClick={() => setInviteOpen(false)} aria-label="Close invite dialog">×</button>
          </div>
          {formError && <div className="view-group-message" role="alert">{formError}</div>}
          <input
            className="view-group-invite-search"
            type="search"
            placeholder="Search by name or email..."
            value={inviteSearch}
            onChange={event => setInviteSearch(event.target.value)}
          />
          <div className="view-group-invite-list">
            {inviteUsers.filter(user => `${user.name || ''} ${user.email || ''}`.toLowerCase().includes(inviteSearch.toLowerCase())).map(user => (
              <button key={getId(user)} type="button" className="view-group-invite-user" onClick={() => sendInvitation(user)} disabled={inviteBusy}>
                <span className="view-group-avatar">{(user.name || '?').slice(0, 1).toUpperCase()}</span>
                <span><strong>{user.name}</strong><small>{user.email}</small></span>
              </button>
            ))}
            {!inviteUsers.length && <p className="view-group-empty">There are no users available to invite.</p>}
          </div>
        </section>
      </div>}
    </section>
  )
}

export default ViewGroup
