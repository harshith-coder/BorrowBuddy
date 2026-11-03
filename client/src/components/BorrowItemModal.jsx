import GroupIcon from './GroupIcon'

function ItemIcon({ item }) {
  const value = `${item.category || ''} ${item.name || ''}`.toLowerCase()
  if (value.includes('headphone')) return <GroupIcon name="headphones" />
  if (value.includes('book')) return <GroupIcon name="book" />
  if (value.includes('usb') || value.includes('cable')) return <GroupIcon name="usb" />
  if (value.includes('mouse')) return <GroupIcon name="mouse" />
  if (value.includes('laptop') || value.includes('computer')) return <GroupIcon name="laptop" />
  return <GroupIcon name="box" />
}

function BorrowItemModal({ member, items, selectedItemId, onSelect, onClose, onContinue }) {
  return (
    <div className="borrow-choice-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="borrow-choice-modal" role="dialog" aria-modal="true" aria-labelledby="borrow-choice-title">
        <header className="borrow-choice-header">
          <div><h2 id="borrow-choice-title">Choose an Item to Borrow</h2><p>Select one item from {member.name}'s inventory.</p></div>
          <button type="button" className="borrow-choice-close" onClick={onClose} aria-label="Close"><GroupIcon name="close" /></button>
        </header>
        <div className="borrow-choice-list">
          {items.map(item => {
            const available = item.status === 'available'
            const selected = item._id === selectedItemId
            return <button
              type="button"
              className={`borrow-choice-item${selected ? ' selected' : ''}${!available ? ' disabled' : ''}`}
              key={item._id}
              disabled={!available}
              aria-pressed={selected}
              onClick={() => onSelect(item._id)}
            >
              <ItemIcon item={item} />
              <strong>{item.name}</strong>
              <span className={`borrow-choice-status${available ? '' : ' borrowed'}`}>{available ? 'Available' : 'Borrowed'}</span>
              <span className={`borrow-choice-radio${selected ? ' checked' : ''}`} aria-hidden="true" />
            </button>
          })}
        </div>
        <footer className="borrow-choice-actions">
          <button type="button" className="borrow-secondary-button" onClick={onClose}>Cancel</button>
          <button type="button" className="borrow-primary-button" disabled={!selectedItemId} onClick={onContinue}>Continue</button>
        </footer>
      </section>
    </div>
  )
}

export default BorrowItemModal
