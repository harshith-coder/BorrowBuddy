import { useState } from 'react'
import GroupIcon from './GroupIcon'

const toInputDate = date => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function BorrowItemForm({ item, owner, borrowerName, borrowerOptions = [], defaultBorrowerId = '', mockMode = false, onCancel, onSubmit, busy = false, error = '' }) {
  const checkoutDate = toInputDate(new Date())
  const [duration, setDuration] = useState('7')
  const [returnDate, setReturnDate] = useState(() => {
    const due = new Date()
    due.setDate(due.getDate() + 7)
    return toInputDate(due)
  })
  const [purpose, setPurpose] = useState('')
  const [requesterId, setRequesterId] = useState(defaultBorrowerId)

  const changeDuration = value => {
    setDuration(value)
    const due = new Date()
    due.setDate(due.getDate() + Number(value))
    setReturnDate(toInputDate(due))
  }
  const activeBorrowerName = mockMode
    ? borrowerOptions.find(member => String(member.id || member._id) === requesterId)?.name || borrowerName
    : borrowerName

  const handleSubmit = event => {
    event.preventDefault()
    if (!returnDate || returnDate < checkoutDate) return
    onSubmit({ checkoutDate, returnDate, durationDays: Number(duration), purpose: purpose.trim(), borrowerId: requesterId })
  }

  return (
    <section className="borrow-form-page">
      <header className="borrow-form-page-header">
        <button type="button" onClick={onCancel} aria-label="Back to View Group"><GroupIcon name="back" /></button>
        <h1>Borrow Item</h1>
      </header>
      <form className="borrow-form-card" onSubmit={handleSubmit}>
        <div className="borrow-selected-item">
          <span className="borrow-selected-icon"><GroupIcon name="box" /></span>
          <div><strong>{item.name}</strong><span className="borrow-available-badge">Available</span><small>Owner: {owner.name}</small></div>
        </div>
        <div className="borrow-form-fields">
          {mockMode && borrowerOptions.length > 0 && <label className="borrow-form-field"><span>Request as</span>
            <select value={requesterId} onChange={event => setRequesterId(event.target.value)}>{borrowerOptions.map(member => <option key={member.id || member._id} value={member.id || member._id}>{member.name}</option>)}</select>
          </label>}
          <label className="borrow-form-field"><span>Borrow Duration <b>*</b></span>
            <select value={duration} onChange={event => changeDuration(event.target.value)}>
              <option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option>
            </select>
          </label>
          <label className="borrow-form-field"><span>Return Date</span>
            <span className="borrow-date-input"><GroupIcon name="calendar" /><input type="date" min={checkoutDate} value={returnDate} onChange={event => setReturnDate(event.target.value)} required /></span>
          </label>
          <label className="borrow-form-field borrow-purpose-field"><span>Purpose (optional)</span>
            <textarea maxLength={200} value={purpose} onChange={event => setPurpose(event.target.value)} placeholder="e.g., Project work, Exam preparation..." />
            <small>{purpose.length}/200</small>
          </label>
        </div>
        {error && <p className="borrow-form-error" role="alert">{error}</p>}
        <footer className="borrow-form-actions">
          <span className="borrow-form-borrower">Requesting as {activeBorrowerName}</span>
          <div><button type="button" className="borrow-secondary-button" onClick={onCancel}>Cancel</button><button type="submit" className="borrow-primary-button" disabled={busy || !returnDate || returnDate < checkoutDate}>{busy ? 'Requesting…' : 'Request Borrow'}</button></div>
        </footer>
      </form>
    </section>
  )
}

export default BorrowItemForm
