import GroupIcon from '../GroupIcon'

const displayDate = value => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

function Drawer({ title, onClose, children }) {
  return <div className="inventory-drawer-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <aside className="inventory-drawer" role="dialog" aria-modal="true" aria-label={title}>
      <header><div><h2>{title}</h2><p>BorrowBuddy updates for you</p></div><button type="button" aria-label={`Close ${title}`} onClick={onClose}><GroupIcon name="close" /></button></header>
      <div className="inventory-drawer-content">{children}</div>
    </aside>
  </div>
}

export function InvitationsPanel({ invitations, onRespond, onClose }) {
  return <Drawer title="Invitations" onClose={onClose}>
    {invitations.length ? invitations.map(invitation => <article className="inventory-panel-card" key={invitation._id}>
      <strong>{invitation.groupName || invitation.groupId?.name || 'Group invitation'}</strong>
      <p>{invitation.inviterName || invitation.inviterId?.name || 'A group member'} invited you to join {invitation.groupName || invitation.groupId?.name || 'a group'}.</p>
      <small>Invited {displayDate(invitation.createdAt)}</small>
      {invitation.status === 'pending' ? <footer><button type="button" className="inventory-secondary" onClick={() => onRespond(invitation._id, 'rejected')}>Reject</button><button type="button" className="inventory-primary" onClick={() => onRespond(invitation._id, 'accepted')}>Accept</button></footer> : <span className={`inventory-result ${invitation.status}`}>{invitation.status}</span>}
    </article>) : <div className="inventory-panel-empty"><GroupIcon name="people" /><strong>No invitations yet</strong><span>Group invitations will appear here.</span></div>}
  </Drawer>
}

export function NotificationsPanel({ requests, onRespond, onClose }) {
  return <Drawer title="Notifications" onClose={onClose}>
    {requests.length ? requests.map(request => <article className="inventory-panel-card" key={request._id}>
      <div className="inventory-request-title"><span><GroupIcon name="box" /></span><strong>{request.borrowerName} requested to borrow your {request.itemName}.</strong></div>
      <p>Requested {displayDate(request.createdAt)} · Return by {displayDate(request.returnDate || request.dueDate)}</p>
      {request.purpose && <p className="inventory-request-purpose">Purpose: {request.purpose}</p>}
      {request.status === 'pending' ? <footer><button type="button" className="inventory-secondary reject" onClick={() => onRespond(request._id, 'rejected')}>Reject</button><button type="button" className="inventory-primary" onClick={() => onRespond(request._id, 'approved')}>Accept</button></footer> : <span className={`inventory-result ${request.status}`}>{request.status === 'approved' ? 'Approved' : 'Rejected'}</span>}
    </article>) : <div className="inventory-panel-empty"><GroupIcon name="bell" /><strong>No notifications yet</strong><span>Borrow requests for your items will appear here.</span></div>}
  </Drawer>
}
