import { createMockGroupData } from '../data/mockGroupData'

const API = 'http://localhost:3000/api'

export async function loadGroupData(group, token) {
  if (/^friends(?: group)?$/i.test((group?.name || '').trim())) {
    return createMockGroupData(group)
  }

  const headers = { Authorization: `Bearer ${token}` }
  const [memberResponse, itemResponse, loanResponse] = await Promise.all([
    fetch(`${API}/groups/${group._id}/members`, { headers }),
    fetch(`${API}/groups/${group._id}/items`, { headers }),
    fetch(`${API}/groups/${group._id}/loans`, { headers }),
  ])
  const [memberData, itemData, loanData] = await Promise.all([
    memberResponse.json(), itemResponse.json(), loanResponse.json(),
  ])
  if (!memberResponse.ok || !memberData.success) throw new Error(memberData.message || 'Could not load group members')
  if (!itemResponse.ok || !itemData.success) throw new Error(itemData.message || 'Could not load group items')
  if (!loanResponse.ok || !loanData.success) throw new Error(loanData.message || 'Could not load group loans')
  return {
    group,
    members: memberData.data || [],
    items: itemData.data || [],
    loans: loanData.data || [],
    source: 'api',
  }
}
