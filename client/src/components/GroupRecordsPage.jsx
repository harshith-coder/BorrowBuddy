import { useEffect, useState } from 'react'
import GroupIcon from './GroupIcon'

const API = 'http://localhost:3000/api'
const dateText = value => value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

function GroupRecordsPage({ type }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isInventory = type === 'inventory'

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const token = localStorage.getItem('token')
        const headers = { Authorization: `Bearer ${token}` }
        const groupsResponse = await fetch(`${API}/groups`, { headers })
        const groupsData = await groupsResponse.json()
        if (!groupsResponse.ok || !groupsData.success) throw new Error(groupsData.message || 'Could not load your groups')
        const results = await Promise.all((groupsData.data || []).map(async group => {
          const [recordResponse, memberResponse] = await Promise.all([
            fetch(`${API}/groups/${group._id}/${isInventory ? 'items' : 'loans'}`, { headers }),
            fetch(`${API}/groups/${group._id}/members`, { headers }),
          ])
          const [recordData, memberData] = await Promise.all([recordResponse.json(), memberResponse.json()])
          if (!recordResponse.ok || !recordData.success) throw new Error(recordData.message || 'Could not load group records')
          if (!memberResponse.ok || !memberData.success) throw new Error(memberData.message || 'Could not load group members')
          return (recordData.data || []).map(record => ({
            ...record,
            groupName: group.name,
            members: memberData.data || [],
          }))
        }))
        if (!cancelled) setRecords(results.flat())
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || 'Could not load records')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [isInventory])

  return <section className="group-records-page">
    <header className="group-records-header"><span><GroupIcon name={isInventory ? 'box' : 'borrow'} /></span><div><h1>{isInventory ? 'Inventory' : 'Loans'}</h1><p>{isInventory ? 'Items shared across your groups' : 'Borrowing activity across your groups'}</p></div></header>
    {error && <div className="group-records-error" role="alert">{error}</div>}
    {loading ? <div className="group-records-empty">Loading {isInventory ? 'inventory' : 'loans'}…</div> : records.length ? <div className="group-records-list">
      {records.map(record => {
        const item = isInventory ? record : record.itemId
        const ownerId = item?.ownerId?._id || item?.ownerId
        const owner = record.members.find(member => String(member._id) === String(ownerId))
        const borrowerName = record.borrowerId?.name || '—'
        return <article className="group-record-row" key={`${record.groupName}-${record._id}`}>
          <span className="group-record-icon"><GroupIcon name="box" /></span>
          <div className="group-record-main"><strong>{item?.name || 'Item'}</strong><span>{record.groupName}{owner?.name ? ` · Owner: ${owner.name}` : ''}{!isInventory ? ` · Borrower: ${borrowerName}` : ''}</span></div>
          {isInventory ? <><span className="group-record-category">{record.category || 'General'}</span><span className={`group-record-status ${record.status}`}>{record.status}</span></> : <div className="group-record-dates"><span>Borrowed {dateText(record.checkoutDate)}</span><span>{record.status === 'returned' ? 'Returned' : 'Due'} {dateText(record.status === 'returned' ? record.returnDate : record.dueDate)}</span></div>}
          {!isInventory && <span className={`group-record-status ${record.status}`}>{record.status}</span>}
        </article>
      })}
    </div> : <div className="group-records-empty">No {isInventory ? 'items' : 'loans'} found in your groups.</div>}
  </section>
}

export default GroupRecordsPage
