import { useBorrowBuddy } from '../../context/useBorrowBuddy'

const dateText = value => value ? new Date(value).toLocaleString() : 'Just now'

function MockRequestNotifications({ showEmpty = false }) {
  const { requests, currentMemberId } = useBorrowBuddy()
  const relevant = requests.filter(request => request.ownerId === currentMemberId || request.borrowerId === currentMemberId)
  if (relevant.length === 0) return showEmpty ? <div className="no-notifications">No notifications.</div> : null

  return relevant.map(request => {
    const title = request.status === 'pending'
      ? 'Borrow request received'
      : request.status === 'approved' ? 'Borrow request approved' : 'Borrow request rejected'
    const message = request.status === 'pending'
      ? `${request.borrowerName} requested to borrow ${request.itemName}.`
      : `The request for ${request.itemName} was ${request.status}.`
    return <div key={request._id} className={`notification-item ${request.status === 'pending' ? 'unread' : ''}`}>
      <div className="notification-icon">!</div>
      <div className="notification-content"><div className="notification-item-title">{title}</div><div className="notification-item-msg">{message}</div><div className="notification-item-time">{dateText(request.respondedAt || request.createdAt)}</div></div>
    </div>
  })
}

export default MockRequestNotifications
