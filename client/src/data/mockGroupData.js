const members = [
  { id: 'rahul', name: 'Rahul', email: 'rahul@example.com', department: 'CSE', year: '3rd Year', phone: '+1 555 0101' },
  { id: 'kiran', name: 'Kiran', email: 'kiran@example.com', department: 'ECE', year: '2nd Year', phone: '+1 555 0102' },
  { id: 'priya', name: 'Priya', email: 'priya@example.com', department: 'IT', year: '3rd Year', phone: '+1 555 0103' },
  { id: 'srikar', name: 'Srikar', email: 'srikar@example.com', department: 'CSE', year: '4th Year', phone: '+1 555 0104' },
  { id: 'ananya', name: 'Ananya', email: 'ananya@example.com', department: 'EEE', year: '2nd Year', phone: '+1 555 0105' },
  { id: 'varun', name: 'Varun', email: 'varun@example.com', department: 'Mechanical', year: '3rd Year', phone: '+1 555 0106' },
  { id: 'meghana', name: 'Meghana', email: 'meghana@example.com', department: 'IT', year: '2nd Year', phone: '+1 555 0107' },
]

const itemRows = [
  ['rahul', 'Laptop', 'Electronics', 'available'],
  ['rahul', 'Laptop Charger', 'Electronics', 'available'],
  ['rahul', 'Notebook', 'Study Materials', 'available'],
  ['rahul', 'Mouse', 'Electronics', 'borrowed'],
  ['kiran', 'Calculator', 'Electronics', 'available'],
  ['kiran', 'Headphones', 'Electronics', 'available'],
  ['kiran', 'USB Drive', 'Electronics', 'available'],
  ['kiran', 'Water Bottle', 'Others', 'available'],
  ['priya', 'Book', 'Books', 'available'],
  ['priya', 'Keyboard', 'Electronics', 'available'],
  ['priya', 'Power Bank', 'Electronics', 'available'],
  ['priya', 'Scientific Calculator', 'Study Materials', 'borrowed'],
  ['srikar', 'HDMI Cable', 'Electronics', 'borrowed'],
  ['srikar', 'Laptop', 'Electronics', 'available'],
  ['srikar', 'Notes', 'Study Materials', 'available'],
  ['srikar', 'Headphones', 'Electronics', 'available'],
  ['ananya', 'Water Bottle', 'Others', 'available'],
  ['ananya', 'Book', 'Books', 'available'],
  ['ananya', 'USB Drive', 'Electronics', 'available'],
  ['ananya', 'Notebook', 'Study Materials', 'available'],
  ['varun', 'Keyboard', 'Electronics', 'available'],
  ['varun', 'Laptop Charger', 'Electronics', 'available'],
  ['varun', 'Power Bank', 'Electronics', 'available'],
  ['varun', 'Notes', 'Study Materials', 'available'],
  ['meghana', 'Calculator', 'Study Materials', 'available'],
  ['meghana', 'Book', 'Books', 'available'],
  ['meghana', 'HDMI Cable', 'Electronics', 'available'],
  ['meghana', 'Mouse', 'Electronics', 'available'],
]

const dateAtOffset = days => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

export function createMockGroupData(group = {}) {
  const mockMembers = members.map(member => ({ ...member }))
  const mockItems = itemRows.map(([ownerId, name, category, status], index) => ({
    _id: `friends-item-${index + 1}`,
    ownerId,
    name,
    category,
    status,
    description: '',
    dateAdded: dateAtOffset(-30 + (index % 28)),
  }))
  const getItem = name => mockItems.find(item => item.name === name && item.status === 'borrowed')
  const loans = [
    { item: getItem('Mouse'), borrowerId: 'kiran', borrowedDaysAgo: -1, dueInDays: 6, note: 'Daily use' },
    { item: getItem('Scientific Calculator'), borrowerId: 'varun', borrowedDaysAgo: -2, dueInDays: 5, note: 'Assignment' },
    { item: getItem('HDMI Cable'), borrowerId: 'rahul', borrowedDaysAgo: -1, dueInDays: 6, note: 'Presentation' },
  ].filter(entry => entry.item).map((entry, index) => ({
    _id: `friends-loan-${index + 1}`,
    itemId: entry.item._id,
    itemName: entry.item.name,
    ownerId: entry.item.ownerId,
    ownerName: mockMembers.find(member => member.id === entry.item.ownerId)?.name || 'Group member',
    borrowerId: entry.borrowerId,
    borrowerName: mockMembers.find(member => member.id === entry.borrowerId)?.name || 'Group member',
    checkoutDate: dateAtOffset(entry.borrowedDaysAgo),
    dueDate: dateAtOffset(entry.dueInDays),
    returnDate: null,
    note: entry.note,
    status: 'active',
  }))

  return {
    group: { ...group, name: group.name || 'Friends' },
    members: mockMembers,
    items: mockItems,
    loans,
    source: 'mock',
  }
}
