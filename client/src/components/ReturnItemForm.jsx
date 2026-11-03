import { useState } from 'react'
import GroupIcon from './GroupIcon'

const toInputDate = date => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function ReturnItemForm({ item, owner, onCancel, onSubmit, busy = false, error = '' }) {
  const [returnDate, setReturnDate] = useState(() => toInputDate(new Date()))
  const [note, setNote] = useState('')

  const handleSubmit = event => {
    event.preventDefault()
    if (!returnDate) return
    onSubmit({ returnDate, note: note.trim() })
  }

  return <section className="return-form-page">
    <header className="borrow-form-page-header">
      <button type="button" onClick={onCancel} aria-label="Back to borrowed items"><GroupIcon name="back" /></button>
      <h1>Return Item</h1>
    </header>
    <form className="return-form-card" onSubmit={handleSubmit}>
      <div className="return-selected-item">
        <span className="return-selected-icon"><GroupIcon name="box" /></span>
        <div><strong>{item.name}</strong><span>{item.category || 'General'}</span>{owner?.name && <small>Owner: {owner.name}</small>}</div>
      </div>
      <label className="return-form-field"><span>Return Date <b>*</b></span>
        <span className="borrow-date-input"><GroupIcon name="calendar" /><input type="date" value={returnDate} onChange={event => setReturnDate(event.target.value)} required /></span>
      </label>
      <label className="return-form-field"><span>Note (optional)</span>
        <textarea maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="Item returned in good condition." />
      </label>
      {error && <p className="borrow-form-error" role="alert">{error}</p>}
      <footer className="return-form-actions">
        <button type="button" className="borrow-secondary-button" onClick={onCancel}>Cancel</button>
        <button type="submit" className="return-confirm-button" disabled={busy || !returnDate}>{busy ? 'Returning…' : 'Confirm Return'}</button>
      </footer>
    </form>
  </section>
}

export default ReturnItemForm
