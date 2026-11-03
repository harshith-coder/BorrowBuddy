import GroupIcon from './GroupIcon'

const itemIconFor = item => {
  const name = `${item.category || ''} ${item.name || ''}`.toLowerCase()
  if (name.includes('headphone')) return 'headphones'
  if (name.includes('book') || name.includes('textbook')) return 'book'
  if (name.includes('usb') || name.includes('cable')) return 'usb'
  if (name.includes('mouse')) return 'mouse'
  if (name.includes('laptop') || name.includes('computer')) return 'laptop'
  return 'box'
}

function MemberAccordion({ member, items, expanded, onToggle, onBorrow }) {
  const availableItems = items.filter(item => item.status === 'available')
  const departmentLine = [member.department, member.year].filter(Boolean).join(', ')

  return (
    <article className={`view-group-member-card${expanded ? ' expanded' : ''}`}>
      <button className="view-group-member-toggle" type="button" aria-expanded={expanded} onClick={onToggle}>
        <span className="view-group-avatar">{(member.name || '?').slice(0, 1).toUpperCase()}</span>
        <strong>{member.name || 'Member'}</strong>
        <GroupIcon name="chevron" />
      </button>
      {expanded && <div className="view-group-member-details">
        <section className="view-group-member-about">
          <h3><GroupIcon name="user" />About {member.name}</h3>
          <p><GroupIcon name="mail" />{member.email || 'Email not available'}</p>
          {departmentLine && <p><GroupIcon name="department" />{departmentLine}</p>}
        </section>
        <section className="view-group-member-inventory">
          <h3><GroupIcon name="box" />Available Items ({availableItems.length})</h3>
          {items.length ? <div className="view-group-item-chips">
            {items.map(item => <div className={`view-group-item-chip${item.status === 'borrowed' ? ' borrowed' : ''}`} key={item._id}>
              <GroupIcon name={itemIconFor(item)} />
              <strong>{item.name}</strong>
              <span>{item.status === 'available' ? 'Available' : 'Borrowed'}</span>
            </div>)}
          </div> : <p className="view-group-no-items">No items shared by this member.</p>}
          {availableItems.length > 0 && <button className="view-group-borrow-item" type="button" onClick={onBorrow}>
            <GroupIcon name="borrow" />Borrow Item
          </button>}
        </section>
      </div>}
    </article>
  )
}

export default MemberAccordion
