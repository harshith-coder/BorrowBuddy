import { useEffect, useState } from 'react'

const categories = ['Electronics', 'Books', 'Stationery', 'Sports', 'Accessories', 'Other']

function AddItemModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || '',
    description: item?.description || '',
    status: item?.status === 'borrowed' ? 'Borrowed' : 'Available',
  })
  const [error, setError] = useState('')
  useEffect(() => {
    const closeOnEscape = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const submit = event => {
    event.preventDefault()
    if (!form.name.trim() || !form.category) {
      setError('Please enter an item name and select a category.')
      return
    }
    onSave({ ...form, name: form.name.trim(), description: form.description.trim() })
  }

  return <div className="inventory-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="inventory-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-modal-title">
      <h2 id="inventory-modal-title">{item ? 'Edit Item' : 'Add New Item'}</h2>
      <form onSubmit={submit}>
        <label>Item Name<input name="name" value={form.name} onChange={update} placeholder="Enter item name" autoFocus /></label>
        <label>Category<select name="category" value={form.category} onChange={update}><option value="">Select category</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
        <label>Description<textarea name="description" value={form.description} onChange={update} placeholder="Enter description" rows="3" /></label>
        <label>Status<select name="status" value={form.status} onChange={update}><option>Available</option><option>Borrowed</option></select></label>
        {error && <p className="inventory-form-error" role="alert">{error}</p>}
        <footer><button type="button" className="inventory-secondary" onClick={onClose}>Cancel</button><button type="submit" className="inventory-primary">{item ? 'Save Changes' : 'Add Item'}</button></footer>
      </form>
    </section>
  </div>
}

export default AddItemModal
