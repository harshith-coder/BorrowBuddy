import { useBorrowBuddy } from '../../context/useBorrowBuddy'

function GroupItemCount({ groupName, type = 'items' }) {
  const { groupData } = useBorrowBuddy()
  if (!/^friends(?: group)?$/i.test((groupName || '').trim())) return 0
  return type === 'loans'
    ? groupData.loans.filter(loan => ['active', 'overdue'].includes(loan.status)).length
    : groupData.items.length
}

export default GroupItemCount
