import GroupIcon from './GroupIcon'
import { getAssetUrl } from '../services/apiClient'

const displayDate = value => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

function BorrowedItems({ loans, items, members, mode, onReturn }) {
  const rows = loans.map(loan => {
    const itemId = loan.itemId?._id || loan.itemId
    const item = typeof loan.itemId === 'object' ? loan.itemId : items.find(candidate => candidate._id === itemId)
    const ownerId = loan.ownerId || item?.ownerId?._id || item?.ownerId
    const owner = members.find(member => String(member._id || member.id) === String(ownerId))
    return {
      ...loan,
      itemName: loan.itemName || item?.name || 'Item',
      itemImage: item?.imageUrl,
      ownerName: loan.ownerName || owner?.name || 'Group member',
      borrowerName: loan.borrowerName || loan.borrowerId?.name || 'You',
    }
  })

  return <section className="borrowed-items-panel">
    {rows.length ? <div className="borrowed-items-list">
      {rows.map(loan => <article className="borrowed-item-row" key={loan._id}>
        <span className="borrowed-item-icon">{loan.itemImage ? <img src={getAssetUrl(loan.itemImage)} alt="" /> : <GroupIcon name="box" />}</span>
        <div className="borrowed-item-main"><strong>{loan.itemName}</strong><span>Owner: {loan.ownerName} · Borrower: {loan.borrowerName}</span></div>
        <div className="borrowed-item-dates"><span>Borrowed {displayDate(loan.checkoutDate)}</span><span>{mode === 'returned' ? 'Returned' : loan.dueDate && new Date(loan.dueDate) < new Date() ? 'Overdue' : 'Due'} {displayDate(mode === 'returned' ? loan.returnDate : loan.dueDate)}</span></div>
        {mode === 'active' ? <button className="borrowed-item-return-button" type="button" onClick={() => onReturn(loan)}>Return Item</button> : <span className="borrowed-item-status returned">Returned</span>}
      </article>)}
    </div> : <div className="borrowed-items-empty"><GroupIcon name="box" /><strong>{mode === 'returned' ? 'No returned items yet' : 'No borrowed items yet'}</strong><span>{mode === 'returned' ? 'Returned items will appear here.' : 'Items borrowed by members of this group will appear here.'}</span></div>}
  </section>
}

export default BorrowedItems
