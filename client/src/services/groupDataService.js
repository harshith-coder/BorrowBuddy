import { apiRequest } from './apiClient'

export async function loadGroupData(group, token) {
  const memberData = await apiRequest(`/groups/${group._id}/members`, {}, token)
  const [itemData, loanData] = await Promise.all([
    apiRequest(`/groups/${group._id}/items`, {}, token),
    apiRequest(`/groups/${group._id}/loans`, {}, token),
  ])
  return {
    group,
    members: memberData.data || [],
    items: itemData.data || [],
    loans: loanData.data || [],
    source: 'api',
  }
}
