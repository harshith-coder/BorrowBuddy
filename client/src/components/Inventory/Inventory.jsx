import { useState } from 'react'
import { useBorrowBuddy } from '../../context/useBorrowBuddy'
import GroupIcon from '../GroupIcon'
import AddItemModal from './AddItemModal'
import InventoryEmptyState from './InventoryEmptyState'
import { InvitationsPanel, NotificationsPanel } from './InventoryPanels'
import './Inventory.css'

const displayDate = value => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const itemIcon = item => {
  const name = `${item.category || ''} ${item.name || ''}`.toLowerCase()
  if (name.includes('headphone')) return 'headphones'
  if (name.includes('book')) return 'book'
  if (name.includes('laptop') || name.includes('computer')) return 'laptop'
  if (name.includes('usb') || name.includes('cable')) return 'usb'
  return 'box'
}

function Inventory({ invitations = [], onInvitation }) {
  const { groupData, requests, currentMemberId, addItem, updateItem, deleteItem, respondToRequest, loading, error } = useBorrowBuddy()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [openPanel, setOpenPanel] = useState('')
  const [notice, setNotice] = useState('')
  const [deletingItemId, setDeletingItemId] = useState('')
  const [respondingRequestId, setRespondingRequestId] = useState('')
  const ownedItems = groupData.items.filter(item => String(item.ownerId?._id || item.ownerId) === currentMemberId)
  const availableItems = ownedItems.filter(item => item.status === 'available').length
  const borrowedItems = ownedItems.filter(item => ['requested', 'booked', 'borrowed'].includes(item.status)).length
  const ownerRequests = requests.filter(request =>
    String(request.lenderId?._id || request.lenderId) === String(currentMemberId)
  )
  const pendingRequests = ownerRequests.filter(request => request.status === 'requested').length
  const pendingInvitations = invitations.filter(invitation => invitation.status === 'pending').length

  const showNotice = message => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 4000)
  }
  const openAddModal = () => { setEditingItem(null); setModalOpen(true) }
  const saveItem = async values => {
    try {
      if (editingItem) await updateItem(editingItem._id, values)
      else await addItem(values)
      setModalOpen(false)
      setEditingItem(null)
      showNotice(editingItem ? 'Item updated.' : 'Item added to your inventory.')
    } catch (saveError) {
      showNotice(saveError.message || 'Could not save item.')
    }
  }
  const removeItem = async item => {
    if (deletingItemId) return
    setDeletingItemId(item._id)
    try {
      await deleteItem(item._id)
      showNotice('Item deleted.')
    } catch (deleteError) {
      showNotice(deleteError.message || 'Could not delete item.')
    } finally {
      setDeletingItemId('')
    }
  }
  const respondRequest = async (requestId, action) => {
    if (respondingRequestId) return
    setRespondingRequestId(requestId)
    try {
      await respondToRequest(requestId, action)
      showNotice(action === 'approved' ? 'Borrow request approved.' : 'Borrow request rejected. The item remains available.')
    } catch (responseError) {
      showNotice(responseError.message || 'Could not update the borrow request.')
    } finally {
      setRespondingRequestId('')
    }
  }
  const respondInvitation = async (invitationId, action) => {
    const success = onInvitation ? await onInvitation(invitationId, action === 'accepted' ? 'accept' : 'reject') : false
    showNotice(success
      ? action === 'accepted' ? 'Invitation accepted.' : 'Invitation rejected.'
      : 'Could not update the invitation. Please try again.')
  }

  return <section className="inventory-page">
    <header className="inventory-header">
      <div><h1>Inventory</h1><p>Share what you have and let your group borrow from you.</p></div>
      <div className="inventory-header-actions">
        <button type="button" className="inventory-icon-button" aria-label={`Invitations${pendingInvitations ? ` (${pendingInvitations} pending)` : ''}`} onClick={() => setOpenPanel(openPanel === 'invitations' ? '' : 'invitations')}><GroupIcon name="people" />{pendingInvitations > 0 && <span>{pendingInvitations}</span>}</button>
        <button type="button" className="inventory-icon-button" aria-label={`Notifications${pendingRequests ? ` (${pendingRequests} pending)` : ''}`} onClick={() => setOpenPanel(openPanel === 'notifications' ? '' : 'notifications')}><GroupIcon name="bell" />{pendingRequests > 0 && <span>{pendingRequests}</span>}</button>
      </div>
    </header>

    {notice && <div className="inventory-notice" role="status">{notice}</div>}
    {error && <div className="inventory-notice" role="alert">{error}</div>}
    {loading && <div className="inventory-notice" role="status">Loading your inventory…</div>}

    {!loading && ownedItems.length === 0 ? <InventoryEmptyState onAddItem={openAddModal} /> : !loading && <>
      <section className="inventory-summary">
        <article><span><GroupIcon name="box" /></span><div><strong>{ownedItems.length}</strong><small>Total Items</small></div></article>
        <article><span className="is-available"><GroupIcon name="check" /></span><div><strong>{availableItems}</strong><small>Available Items</small></div></article>
        <article><span className="is-borrowed"><GroupIcon name="borrow" /></span><div><strong>{borrowedItems}</strong><small>Borrowed Items</small></div></article>
      </section>
      <div className="inventory-list-heading"><div><h2>Your Items</h2><p>Items shared with your groups</p></div><button className="inventory-primary" type="button" onClick={openAddModal}><b>＋</b>Add Item</button></div>
      <section className="inventory-item-grid">
        {ownedItems.map(item => <article className="inventory-item-card" key={item._id}>
          <div className="inventory-item-card-heading"><span className="inventory-item-icon"><GroupIcon name={itemIcon(item)} /></span><span className={`inventory-status ${item.status}`}>{item.status}</span></div>
          <h3>{item.name}</h3><span className="inventory-item-category">{item.category}</span>
          <p>{item.description || 'No description provided.'}</p>
          <footer><span>Added {displayDate(item.dateAdded || item.createdAt)}</span><div><button type="button" aria-label={`Edit ${item.name}`} onClick={() => { setEditingItem(item); setModalOpen(true) }} disabled={Boolean(deletingItemId)}><GroupIcon name="edit" /></button><button type="button" aria-label={`Delete ${item.name}`} onClick={() => removeItem(item)} disabled={deletingItemId === item._id}><GroupIcon name="trash" /></button></div></footer>
        </article>)}
      </section>
    </>}

    {modalOpen && <AddItemModal item={editingItem} onClose={() => { setModalOpen(false); setEditingItem(null) }} onSave={saveItem} />}
    {openPanel === 'invitations' && <InvitationsPanel invitations={invitations} onRespond={respondInvitation} onClose={() => setOpenPanel('')} />}
    {openPanel === 'notifications' && <NotificationsPanel requests={ownerRequests} onRespond={respondRequest} respondingRequestId={respondingRequestId} onClose={() => setOpenPanel('')} />}
  </section>
}

export default Inventory
