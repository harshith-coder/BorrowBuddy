import { useState, useEffect } from 'react'
import heroImage from './assets/hero-image.png'
import './App.css'
import ViewGroup from './components/ViewGroup'
import Inventory from './components/Inventory/Inventory'
import GroupItemCount from './components/Inventory/GroupItemCount'
import MockRequestNotifications from './components/Inventory/MockRequestNotifications'
import { BorrowBuddyProvider } from './context/BorrowBuddyContext'

const API_BASE = 'http://localhost:3000/api'

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token')
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await response.json()
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Request failed')
  }
  return data
}

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '' })
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [authMessage, setAuthMessage] = useState({ type: '', text: '' })
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('token') && localStorage.getItem('user')))
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [groupImage, setGroupImage] = useState(null)
  const [selectedCategories, setSelectedCategories] = useState([])
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [profileImage, setProfileImage] = useState(null)
  const [groups, setGroups] = useState([])
  const [availableMembers, setAvailableMembers] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [loans, setLoans] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [invitations, setInvitations] = useState([])
  const [dataError, setDataError] = useState('')

  const categories = [
    { id: 'books', name: 'Books', icon: '📚' },
    { id: 'electronics', name: 'Electronics', icon: '💻' },
    { id: 'sports', name: 'Sports Equipment', icon: '⚽' },
    { id: 'lab', name: 'Lab Equipment', icon: '🔬' },
    { id: 'tools', name: 'Project Tools', icon: '🔧' },
    { id: 'study', name: 'Study Materials', icon: '📖' },
    { id: 'others', name: 'Others', icon: '📦' },
  ]

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB')
        return
      }
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        alert('Only PNG and JPG files are allowed')
        return
      }
      setGroupImage(file)
    }
  }

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const toggleMember = (memberId) => {
    setAvailableMembers(prev =>
      prev.map(member =>
        member.id === memberId ? { ...member, selected: !member.selected } : member
      )
    )
  }

  async function fetchGroups() {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3000/api/groups', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setGroups(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
      setGroups([])
    }
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Please enter a group name')
      return
    }

    const selectedMemberData = availableMembers.filter(member => member.selected)
    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('name', groupName.trim())
      formData.append('description', groupDescription.trim())
      formData.append('categories', JSON.stringify(selectedCategories))
      if (groupImage) formData.append('image', groupImage)

      const groupResponse = await fetch('http://localhost:3000/api/groups', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
      const groupData = await groupResponse.json()

      if (!groupResponse.ok || !groupData.success) {
        throw new Error(groupData.message || 'Failed to create group')
      }

      for (const member of selectedMemberData) {
        const memberResponse = await fetch(
          'http://localhost:3000/api/invitations',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              groupId: groupData.data._id,
              inviteeId: member.id,
            }),
          }
        )
        const memberData = await memberResponse.json()

        if (!memberResponse.ok || !memberData.success) {
          throw new Error(memberData.message || `Failed to invite ${member.name}`)
        }
      }

      setGroupName('')
      setGroupDescription('')
      setGroupImage(null)
      setSelectedCategories([])
      setAvailableMembers(prev => prev.map(member => ({ ...member, selected: false })))
      setMemberSearchQuery('')
      setCurrentPage('my-groups')
    } catch (error) {
      console.error('Error creating group:', error)
      alert(error.message || 'Failed to create group')
    }
  }

  useEffect(() => {
    if (currentPage !== 'create-group' || !isAuthenticated) return

    const fetchUsers = async () => {
      setMembersLoading(true)

      try {
        const token = localStorage.getItem('token')
        const response = await fetch('http://localhost:3000/api/auth/users', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to load users')
        }

        setAvailableMembers(
          data.data.map(member => ({
            id: member._id,
            name: member.name,
            email: member.email,
            selected: false,
          }))
        )
      } catch (error) {
        console.error('Error fetching users:', error)
        alert(error.message || 'Failed to load users')
      } finally {
        setMembersLoading(false)
      }
    }

    fetchUsers()
  }, [currentPage, isAuthenticated])

  // Fetch groups when on my-groups page
  useEffect(() => {
    if (currentPage === 'my-groups' && isAuthenticated) {
      // Loading the remote group list synchronizes this screen with the API.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchGroups()
    }
  }, [currentPage, isAuthenticated])

  const handleViewGroup = (groupId) => {
    setSelectedGroupId(groupId)
    setCurrentPage('view-group')
  }

  const loadPageData = async (page) => {
    if (!isAuthenticated) return
    setDataError('')
    try {
      if (page === 'loans' || page === 'history') {
        const data = await apiRequest('/loans')
        setLoans(data.data || [])
      } else if (page === 'invitations') {
        const data = await apiRequest('/invitations/me')
        setInvitations(data.data || [])
      } else if (page === 'notifications') {
        const data = await apiRequest('/notifications')
        const nextNotifications = data.data || []
        setNotifications(nextNotifications)
        setUnreadCount(nextNotifications.filter(notification => !notification.read).length)
      }
    } catch (error) {
      console.error(`Error loading ${page}:`, error)
      setDataError(error.message || 'Could not load data')
    }
  }

  useEffect(() => {
    const pageToLoad = currentPage === 'inventory' ? 'invitations' : currentPage
    const timer = window.setTimeout(() => loadPageData(pageToLoad), 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, isAuthenticated])

  const handleLoanAction = async (loanId, action) => {
    try {
      await apiRequest(`/loans/${loanId}/${action}`, { method: 'PATCH' })
      await loadPageData(currentPage)
    } catch (error) {
      setDataError(error.message || 'Could not update loan')
    }
  }

  const handleInvitation = async (invitationId, action) => {
    try {
      await apiRequest(`/invitations/${invitationId}/${action}`, { method: 'PATCH' })
      await loadPageData('invitations')
      if (action === 'accept') await fetchGroups()
      return true
    } catch (error) {
      setDataError(error.message || 'Could not update invitation')
      return false
    }
  }

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, { method: 'PATCH' })
      await loadPageData('notifications')
    } catch (error) {
      setDataError(error.message || 'Could not update notification')
    }
  }

  const handleMarkAllNotificationsRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH' })
      await loadPageData('notifications')
    } catch (error) {
      setDataError(error.message || 'Could not update notifications')
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      })
      const data = await response.json()
      console.log('Signup response:', data)
      if (data.success) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data))
        setAuthMessage({ type: 'success', text: 'Registration successful! Redirecting...' })
        setIsAuthenticated(true)
        setUser(data.data)
        setShowSignup(false)
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setAuthMessage({ type: 'error', text: data.message || 'Registration failed' })
      }
    } catch (error) {
      console.error('Signup error:', error)
      setAuthMessage({ type: 'error', text: `Server error: ${error.message}` })
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      })
      const data = await response.json()
      console.log('Login response:', data)
      if (data.success) {
        localStorage.setItem('token', data.data.token)
        localStorage.setItem('user', JSON.stringify(data.data))
        setAuthMessage({ type: 'success', text: 'Login successful! Redirecting...' })
        setIsAuthenticated(true)
        setUser(data.data)
        setShowLogin(false)
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setAuthMessage({ type: 'error', text: data.message || 'Login failed' })
      }
    } catch (error) {
      console.error('Login error:', error)
      setAuthMessage({ type: 'error', text: `Server error: ${error.message}` })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
    setUser(null)
    window.location.reload()
  }

  return (
    <div className="landing-page">
      {isAuthenticated ? (
        <BorrowBuddyProvider user={user}>
        <div className="dashboard">
          <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M8 12h8M12 8v8" />
                </svg>
              </div>
              <span className="sidebar-logo-text">BorrowBuddy</span>
              <button className="sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {sidebarCollapsed ? (
                    <polyline points="9 18 15 12 9 6" />
                  ) : (
                    <polyline points="15 18 9 12 15 6" />
                  )}
                </svg>
              </button>
            </div>

            <nav className="sidebar-nav">
              <a href="#" className={`sidebar-link ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentPage('dashboard') }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                Dashboard
              </a>
              <a href="#" className={`sidebar-link ${currentPage === 'my-groups' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentPage('my-groups') }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                My Groups
              </a>
              <a href="#" className={`sidebar-link ${currentPage === 'inventory' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentPage('inventory') }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
                Inventory
              </a>
              <a href="#" className={`sidebar-link ${currentPage === 'invitations' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentPage('invitations') }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16v16H4z" />
                  <path d="M4 7l8 5 8-5" />
                </svg>
                Invitations
              </a>
              <a href="#" className={`sidebar-link ${currentPage === 'profile' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentPage('profile') }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </a>
              <a href="#" className="sidebar-link" onClick={handleLogout}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </a>
            </nav>
          </aside>

          <main className="dashboard-main">
            {currentPage === 'dashboard' && (
              <>
                <header className="dashboard-header">
                  <div className="header-content">
                    <h1 className="dashboard-greeting">Good Morning, {user?.name?.split(' ')[0]}!</h1>
                    <p className="dashboard-subtitle">Here's what's happening with your shared items.</p>
                  </div>
                  <div className="header-user">
                    <div className="user-avatar">
                      {user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="user-dropdown">
                      <span className="user-name">{user?.name}</span>
                      <svg className="dropdown-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </header>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon stat-icon-blue">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      </svg>
                    </div>
                    <div className="stat-content">
                      <div className="stat-value"><GroupItemCount groupName="Friends Group" /></div>
                      <div className="stat-label">Total Items</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon stat-icon-green">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                      </svg>
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{loans.filter(loan => ['requested', 'booked', 'active'].includes(loan.status)).length}</div>
                      <div className="stat-label">Active Loans</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon stat-icon-red">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{loans.filter(loan => loan.dueDate && new Date(loan.dueDate) < new Date() && !['returned', 'rejected'].includes(loan.status)).length}</div>
                      <div className="stat-label">Overdue</div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon stat-icon-blue">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div className="stat-content">
                      <div className="stat-value">{groups.length}</div>
                      <div className="stat-label">Groups</div>
                    </div>
                  </div>
                </div>

                <div className="recent-activity">
                  <div className="activity-header">
                    <h2 className="activity-title">Recent Activity</h2>
                    <a href="#" className="view-all">View All</a>
                  </div>

                  <div className="activity-list">
                    <div className="activity-item">
                      <div className="activity-info">
                        <div className="activity-name">Laptop Charger borrowed by Rahul</div>
                        <div className="activity-date">25 Oct 2026 - Due in 2 days</div>
                      </div>
                      <div className="activity-time">2 days ago</div>
                    </div>

                    <div className="activity-item">
                      <div className="activity-info">
                        <div className="activity-name">Book returned by Kiran</div>
                        <div className="activity-date">24 Oct 2026</div>
                      </div>
                      <div className="activity-time">3 days ago</div>
                    </div>

                    <div className="activity-item">
                      <div className="activity-info">
                        <div className="activity-name">Cricket Bat borrowed by Srikar</div>
                        <div className="activity-date">22 Oct 2026</div>
                      </div>
                      <div className="activity-time">5 days ago</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {currentPage === 'my-groups' && (
              <>
                <header className="dashboard-header">
                  <div className="header-content">
                    <h1 className="dashboard-greeting">My Groups</h1>
                    <p className="dashboard-subtitle">Join and manage your groups to share, borrow, and make better use of resources together</p>
                  </div>
                  <button className="create-group-btn" onClick={() => setCurrentPage('create-group')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create Group
                  </button>
                </header>

                <div className="groups-content">
                  <div className="groups-main">
                    <div className="groups-stats">
                      <div className="group-stat-card group-stat-blue">
                        <div className="group-stat-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                        </div>
                        <div className="group-stat-content">
                          <div className="group-stat-value">{groups.length}</div>
                          <div className="group-stat-label">Total Groups</div>
                        </div>
                      </div>

                      <div className="group-stat-card group-stat-green">
                        <div className="group-stat-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                          </svg>
                        </div>
                        <div className="group-stat-content">
                          <div className="group-stat-value">{groups.reduce((acc, group) => acc + (group.memberIds?.length || 0), 0)}</div>
                          <div className="group-stat-label">Total Members</div>
                        </div>
                      </div>

                      <div className="group-stat-card group-stat-orange">
                        <div className="group-stat-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                          </svg>
                        </div>
                        <div className="group-stat-content">
                          <div className="group-stat-value">0</div>
                          <div className="group-stat-label">Active Loans</div>
                        </div>
                      </div>
                    </div>

                    <div className="groups-search-bar">
                      <div className="search-input-wrapper">
                        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input type="text" placeholder="Search groups..." className="search-input" />
                      </div>
                      <select className="category-select">
                        <option>All Categories</option>
                        <option>Books</option>
                        <option>Electronics</option>
                        <option>Sports</option>
                        <option>Tools</option>
                      </select>
                    </div>

                    <div className="groups-list">
                      {groups.length === 0 ? (
                        <div className="no-groups-message">
                          <p>No groups yet. Create your first group to get started!</p>
                        </div>
                      ) : (
                        groups.map((group) => (
                          <div key={group._id} className="group-compact-card">
                            <div className="group-compact-left">
                              {group.image ? (
                                <img src={`http://localhost:3000/${group.image}`} alt={group.name} className="group-compact-image" />
                              ) : (
                                <div className="group-compact-icon">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="group-compact-center">
                              <h3 className="group-compact-name">{group.name}</h3>
                              <div className="group-compact-tags">
                                {group.categories && group.categories.map((cat, idx) => (
                                  <span key={idx} className="group-compact-tag">{cat}</span>
                                ))}
                              </div>
                              <p className="group-compact-desc">{group.description || 'No description'}</p>
                            </div>
                            <div className="group-compact-right">
                              <button className="group-compact-view-btn" onClick={() => handleViewGroup(group._id)}>
                                View Group
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              </button>
                            </div>
                            <div className="group-compact-bottom">
                              <div className="group-compact-members">
                                {group.memberIds && group.memberIds.slice(0, 4).map((member, idx) => (
                                  <div key={idx} className={`member-avatar-compact ${['charcoal', 'slate', 'purple', 'light'][idx % 4]}`}>
                                    {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                                  </div>
                                ))}
                                {group.memberIds && group.memberIds.length > 4 && (
                                  <div className="member-avatar-more-compact">+{group.memberIds.length - 4}</div>
                                )}
                                <span className="member-count-compact">{group.memberIds?.length || 0} members</span>
                              </div>
                              <div className="group-compact-stats">
                                <div className="stat-with-icon">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                  </svg>
                                  <span><GroupItemCount groupName={group.name} /> items</span>
                                </div>
                                <div className="stat-with-icon">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                                  </svg>
                                  <span><GroupItemCount groupName={group.name} type="loans" /> active loans</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <aside className="groups-sidebar">
                    <div className="sidebar-section">
                      <div className="sidebar-section-header">
                        <div className="sidebar-section-header-with-icon">
                          <svg className="recent-activity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <h3 className="sidebar-section-title">Recent Activity</h3>
                        </div>
                        <a href="#" className="view-all-link">View All</a>
                      </div>
                      <div className="activity-feed">
                        <div className="feed-item">
                          <div className="feed-icon feed-icon-blue">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <line x1="20" y1="8" x2="20" y2="14" />
                              <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                          </div>
                          <div className="feed-content">
                            <div className="feed-row-top">
                              <p className="feed-text">New member joined</p>
                              <span className="feed-time">2h ago</span>
                            </div>
                            <p className="feed-description">Rahul joined Friends Group</p>
                          </div>
                        </div>

                        <div className="feed-item">
                          <div className="feed-icon feed-icon-green">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            </svg>
                          </div>
                          <div className="feed-content">
                            <div className="feed-row-top">
                              <p className="feed-text">Item borrowed</p>
                              <span className="feed-time">5h ago</span>
                            </div>
                            <p className="feed-description">Book borrowed by Kiran</p>
                          </div>
                        </div>

                        <div className="feed-item">
                          <div className="feed-icon feed-icon-orange">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </div>
                          <div className="feed-content">
                            <div className="feed-row-top">
                              <p className="feed-text">Item returned</p>
                              <span className="feed-time">1d ago</span>
                            </div>
                            <p className="feed-description">Charger returned by Srikar</p>
                          </div>
                        </div>

                        <div className="feed-item">
                          <div className="feed-icon feed-icon-blue">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="8.5" cy="7" r="4" />
                              <line x1="20" y1="8" x2="20" y2="14" />
                              <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                          </div>
                          <div className="feed-content">
                            <div className="feed-row-top">
                              <p className="feed-text">New member joined</p>
                              <span className="feed-time">2d ago</span>
                            </div>
                            <p className="feed-description">Priya joined College Group</p>
                          </div>
                        </div>

                        <div className="feed-item">
                          <div className="feed-icon feed-icon-orange">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </div>
                          <div className="feed-content">
                            <div className="feed-row-top">
                              <p className="feed-text">Group updated</p>
                              <span className="feed-time">3d ago</span>
                            </div>
                            <p className="feed-description">Group settings were updated</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="sidebar-section">
                      <div className="sidebar-section-header-with-icon">
                        <svg className="quick-actions-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        <h3 className="sidebar-section-title">Quick Actions</h3>
                      </div>
                      <div className="quick-actions">
                        <div className="quick-action-card quick-action-create">
                          <div className="quick-action-icon-container">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </div>
                          <div className="quick-action-content">
                            <h4 className="quick-action-title">Create New Group</h4>
                            <p className="quick-action-desc">Start a new group with your friends or colleagues</p>
                          </div>
                          <svg className="quick-action-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                        <div className="quick-action-card quick-action-explore">
                          <div className="quick-action-icon-container quick-action-icon-blue">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                            </svg>
                          </div>
                          <div className="quick-action-content">
                            <h4 className="quick-action-title">Explore Groups</h4>
                            <p className="quick-action-desc">Find and join public groups</p>
                          </div>
                          <svg className="quick-action-arrow quick-action-arrow-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </>
            )}

            {currentPage === 'create-group' && (
              <>
                <header className="dashboard-header">
                  <div className="header-content">
                    <h1 className="dashboard-greeting">Create New Group</h1>
                    <p className="dashboard-subtitle">Create a new group to share and borrow items with your friends</p>
                  </div>
                </header>

                <div className="create-group-container">
                  <div className="create-group-form">
                    {/* Group Details Section */}
                    <div className="form-section">
                      <div className="section-header">
                        <div className="section-icon-wrapper">
                          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                          </svg>
                        </div>
                        <h3 className="section-title">Group Details</h3>
                      </div>

                      <div className="group-details-grid">
                        <div className="image-upload-section">
                          <label className="image-upload-label">
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/jpg"
                              onChange={handleImageUpload}
                              className="image-upload-input"
                            />
                            <div className="image-upload-placeholder">
                              {groupImage ? (
                                <img src={URL.createObjectURL(groupImage)} alt="Group" className="uploaded-image" />
                              ) : (
                                <>
                                  <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
                                  <span className="upload-text">Add Group Image</span>
                                  <span className="upload-subtext">PNG/JPG, max 2MB</span>
                                </>
                              )}
                            </div>
                          </label>
                          {groupImage && (
                            <button
                              className="btn-remove-group-image"
                              onClick={(e) => {
                                e.preventDefault()
                                setGroupImage(null)
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Remove Image
                            </button>
                          )}
                        </div>

                        <div className="group-inputs-section">
                          <div className="form-group">
                            <label className="form-label">Group Name *</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Enter group name"
                              value={groupName}
                              onChange={(e) => setGroupName(e.target.value)}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                              className="form-textarea"
                              placeholder="Tell others what this group is about..."
                              value={groupDescription}
                              onChange={(e) => {
                                if (e.target.value.length <= 150) {
                                  setGroupDescription(e.target.value)
                                }
                              }}
                              maxLength={150}
                            />
                            <div className="char-counter">{groupDescription.length}/150</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="section-divider"></div>

                    {/* Choose Categories Section */}
                    <div className="form-section">
                      <div className="section-header">
                        <div className="section-icon-wrapper">
                          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                          </svg>
                        </div>
                        <h3 className="section-title">Choose Categories</h3>
                      </div>

                      <div className="categories-grid">
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            className={`category-pill ${selectedCategories.includes(category.id) ? 'selected' : ''}`}
                            onClick={() => toggleCategory(category.id)}
                          >
                            <span className="category-icon">{category.icon}</span>
                            <span className="category-name">{category.name}</span>
                            {selectedCategories.includes(category.id) && (
                              <svg className="category-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="section-divider"></div>

                    {/* Add Members Section */}
                    <div className="form-section">
                      <div className="section-header">
                        <div className="section-icon-wrapper">
                          <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                          </svg>
                        </div>
                        <h3 className="section-title">Add Members</h3>
                      </div>

                      <div className="form-group">
                        <div className="input-with-icon">
                          <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Search by name or email..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>

                      {membersLoading ? (
                        <p>Loading users...</p>
                      ) : (
                      <div className="members-list">
                        {availableMembers
                          .filter(member =>
                            member.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                            member.email.toLowerCase().includes(memberSearchQuery.toLowerCase())
                          )
                          .map((member) => (
                            <div key={member.id} className="member-item">
                              <div className="member-avatar">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="member-details">
                                <div className="member-name">{member.name}</div>
                                <div className="member-email">{member.email}</div>
                              </div>
                              <input
                                type="checkbox"
                                className="member-checkbox"
                                checked={member.selected}
                                onChange={() => toggleMember(member.id)}
                              />
                            </div>
                          ))}
                      </div>
                      )}
                    </div>

                    <div className="form-actions">
                      <button className="btn-cancel" onClick={() => setCurrentPage('my-groups')}>
                        Cancel
                      </button>
                      <button className="btn-create" onClick={handleCreateGroup}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Create Group
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {currentPage === 'inventory' && <Inventory invitations={invitations} onInvitation={handleInvitation} />}

            {(currentPage === 'loans' || currentPage === 'history') && (
              <>
                <header className="dashboard-header">
                  <div className="header-content">
                    <h1 className="dashboard-greeting">{currentPage === 'loans' ? 'Loans' : 'Loan History'}</h1>
                    <p className="dashboard-subtitle">Track requests, active loans, and returns.</p>
                  </div>
                </header>
                {dataError && <div className="auth-message error">{dataError}</div>}
                <div className="loans-table-wrapper">
                  <table className="loans-table">
                    <thead><tr><th>Item</th><th>Role</th><th>Other party</th><th>Status</th><th>Due</th><th>Action</th></tr></thead>
                    <tbody>
                      {loans.filter(loan => currentPage === 'history' ? ['returned', 'rejected', 'cancelled'].includes(loan.status) : !['returned', 'rejected', 'cancelled'].includes(loan.status)).map(loan => {
                        const borrower = loan.borrowerId?._id === user?._id
                        const otherParty = borrower ? loan.lenderId?.name : loan.borrowerId?.name
                        const action = loan.status === 'requested' && !borrower ? 'approve' : loan.status === 'requested' && borrower ? 'reject' : loan.status === 'booked' || loan.status === 'active' ? 'return' : null
                        return <tr key={loan._id}><td>{loan.itemId?.name || 'Item'}</td><td>{borrower ? 'Borrower' : 'Owner'}</td><td>{otherParty || '—'}</td><td>{loan.status}</td><td>{loan.dueDate ? new Date(loan.dueDate).toLocaleDateString() : '—'}</td><td>{action && <button className="btn-borrow" onClick={() => handleLoanAction(loan._id, action)}>{action}</button>}{loan.status === 'requested' && !borrower && <button className="btn-cancel" onClick={() => handleLoanAction(loan._id, 'reject')}>Reject</button>}</td></tr>
                      })}
                    </tbody>
                  </table>
                  {loans.filter(loan => currentPage === 'history' ? ['returned', 'rejected', 'cancelled'].includes(loan.status) : !['returned', 'rejected', 'cancelled'].includes(loan.status)).length === 0 && <div className="no-groups-message"><p>No loans to show.</p></div>}
                </div>
              </>
            )}

            {currentPage === 'invitations' && (
              <>
                <header className="dashboard-header"><div className="header-content"><h1 className="dashboard-greeting">Invitations</h1><p className="dashboard-subtitle">Accept or decline invitations before joining a group.</p></div></header>
                {dataError && <div className="auth-message error">{dataError}</div>}
                <div className="loans-table-wrapper"><table className="loans-table"><thead><tr><th>Group</th><th>Invited by</th><th>Status</th><th>Action</th></tr></thead><tbody>
                  {invitations.map(invitation => <tr key={invitation._id}><td>{invitation.groupId?.name || 'Group'}</td><td>{invitation.inviterId?.name || 'Member'}</td><td>{invitation.status}</td><td>{invitation.status === 'pending' && <><button className="btn-borrow" onClick={() => handleInvitation(invitation._id, 'accept')}>Accept</button><button className="btn-cancel" onClick={() => handleInvitation(invitation._id, 'reject')}>Decline</button></>}</td></tr>)}
                </tbody></table>{invitations.length === 0 && <div className="no-groups-message"><p>No invitations.</p></div>}</div>
              </>
            )}

            {currentPage === 'notifications' && (
              <>
                <header className="dashboard-header"><div className="header-content"><h1 className="dashboard-greeting">Notifications</h1><p className="dashboard-subtitle">Stay updated on invitations, borrow requests, and returns.</p></div><button className="btn-mark-all" onClick={handleMarkAllNotificationsRead}>Mark all as read</button></header>
                <div className="notification-list">
                  {notifications.map(notification => <div key={notification._id} className={`notification-item ${notification.read ? '' : 'unread'}`} onClick={() => !notification.read && handleMarkNotificationRead(notification._id)}><div className="notification-icon">!</div><div className="notification-content"><div className="notification-item-title">{notification.title}</div><div className="notification-item-msg">{notification.message}</div><div className="notification-item-time">{new Date(notification.createdAt).toLocaleString()}</div></div></div>)}
                  <MockRequestNotifications showEmpty={notifications.length === 0} />
                </div>
              </>
            )}

            {currentPage === 'profile' && (
              <>
                <header className="dashboard-header">
                  <div className="header-content">
                    <h1 className="dashboard-greeting">Profile</h1>
                    <p className="dashboard-subtitle">Manage your account settings and profile information</p>
                  </div>
                </header>

                <div className="profile-container">
                  <div className="profile-form">
                    <div className="profile-image-section">
                      <div className="profile-image-wrapper">
                        {profileImage ? (
                          <img src={URL.createObjectURL(profileImage)} alt="Profile" className="profile-image-preview" />
                        ) : (
                          <div className="profile-image-placeholder">
                            {user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="profile-image-actions">
                        <label className="btn-upload-image">
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={(e) => {
                              const file = e.target.files[0]
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  alert('File size must be less than 2MB')
                                  return
                                }
                                setProfileImage(file)
                              }
                            }}
                            className="image-upload-input"
                          />
                          Upload Image
                        </label>
                        {profileImage && (
                          <button className="btn-remove-image" onClick={() => setProfileImage(null)}>
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="profile-details-section">
                      <div className="form-group">
                        <label className="form-label">Full Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={user?.name || ''}
                          disabled
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-input"
                          value={user?.email || ''}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {currentPage === 'view-group' && (
              <ViewGroup
                groupId={selectedGroupId}
                group={groups.find(group => group._id === selectedGroupId)}
                onBack={() => setCurrentPage('my-groups')}
              />
            )}

          </main>
        </div>
        </BorrowBuddyProvider>
      ) : (
        <div className="landing-page">
      <nav className="navbar">
        <a href="/" className="nav-logo" id="nav-logo">
          <div className="nav-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M8 12h8M12 8v8" />
            </svg>
          </div>
          <span className="nav-logo-text">BorrowBuddy</span>
        </a>

        <div className={`nav-links${mobileMenuOpen ? ' mobile-open' : ''}`}>
          <a href="#about" id="nav-about">About</a>
          <a href="#projects" id="nav-projects">Projects</a>
          <a href="#contact" id="nav-contact">Contact Us</a>
          <button className="nav-signup" id="nav-signup" onClick={() => setShowSignup(true)}>Sign up</button>
        </div>

        <button
          className="nav-hamburger"
          id="nav-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </nav>

      <section className="hero-section" id="hero">
        <div className="hero-content">
          <p className="hero-tagline">Share Today, Brighter Tomorrow</p>
          <h1 className="hero-heading">
            Borrow, Share<br />
            and Return<br />
            <span className="ease">with Ease.</span>
          </h1>
          <p className="hero-description">
            A simple and organized way to manage shared items
            within your community, team, or classroom.
          </p>
          <div className="hero-buttons">
            <button className="btn-get-started" id="btn-get-started">
              Get Started
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
            <button className="btn-learn-more" id="btn-learn-more">Learn More</button>
          </div>
          <div className="why-heading">
            <span className="why-line"></span>
            <span className="why-text">WHY THIS PRODUCT EXISTS?</span>
          </div>
          <p className="why-description">
            Many useful items sit unused most of the time, while
            others need them. BorrowBuddy exists to make sharing
            easier, reduce unnecessary purchases, and build a
            culture of trust, sustainability and community.
          </p>
        </div>

        <div className="hero-image-wrapper">
          <img
            src={heroImage}
            alt="Shared items including a laptop, headphones, projector, plant, and desk lamp arranged on a navy desk"
            className="hero-image"
          />
        </div>
      </section>

      <section className="features-bar" id="features">
        <div className="feature-item" id="feature-communities">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="7" r="3" />
              <circle cx="17" cy="7" r="3" />
              <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
              <path d="M17 11a4 4 0 014 4v2" />
            </svg>
          </div>
          <div className="feature-text">
            <h3>Build Communities</h3>
            <p>Share within your campus, team or neighborhood.</p>
          </div>
        </div>

        <div className="feature-item" id="feature-track">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
            </svg>
          </div>
          <div className="feature-text">
            <h3>Track Easily</h3>
            <p>Know who borrowed what and when.</p>
          </div>
        </div>

        <div className="feature-item" id="feature-waste">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.45 3.53L17 8l-3.55 1.47L12 13l-1.45-3.53L7 8l3.55-1.47L12 3z" />
              <path d="M5 20h14" />
              <path d="M12 13v7" />
            </svg>
          </div>
          <div className="feature-text">
            <h3>Reduce Waste</h3>
            <p>Give useful items a longer life.</p>
          </div>
        </div>
      </section>

      {showSignup && (
        <div className="signup-overlay" id="signup-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSignup(false) }}>
          <div className="signup-modal" id="signup-modal">
            <button className="signup-close" id="signup-close" onClick={() => setShowSignup(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="signup-left">
              <div className="signup-left-content">
                <div className="signup-brand">
                  <svg className="signup-brand-icon" viewBox="0 0 40 40" fill="none">
                    <circle cx="14" cy="14" r="8" stroke="white" strokeWidth="2.5" fill="none" />
                    <circle cx="26" cy="14" r="8" stroke="white" strokeWidth="2.5" fill="none" />
                  </svg>
                  <div>
                    <div className="signup-brand-name">BorrowBuddy</div>
                    <div className="signup-brand-sub">Borrow & Return Tracker</div>
                  </div>
                </div>
                <p className="signup-tagline">Share items. Build better habits.</p>
                <div className="signup-categories">
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                    </svg>
                    <span>Books</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 2v4M17 2v4" />
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M12 10v4" />
                    </svg>
                    <span>Chargers</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                    </svg>
                    <span>Tools</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    <span>Sports</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="6" cy="12" r="1" />
                      <circle cx="18" cy="12" r="1" />
                    </svg>
                    <span>And more...</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="signup-right">
              <h2 className="signup-title">Create Account</h2>
              <p className="signup-subtitle">Join BorrowBuddy today!</p>

              <form className="signup-form" id="signup-form" onSubmit={handleSignup}>
                {authMessage.text && (
                  <div className={`auth-message ${authMessage.type}`}>
                    {authMessage.text}
                  </div>
                )}
                <div className="signup-field">
                  <label className="signup-label" htmlFor="signup-name">Full Name</label>
                  <input
                    className="signup-input"
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={signupData.name}
                    onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  />
                </div>

                <div className="signup-field">
                  <label className="signup-label" htmlFor="signup-email">Email address</label>
                  <input
                    className="signup-input"
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  />
                </div>

                <div className="signup-field">
                  <label className="signup-label" htmlFor="signup-password">Password</label>
                  <div className="signup-password-wrapper">
                    <svg className="signup-password-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <input
                      className="signup-input signup-input-password"
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="signup-password-toggle"
                      id="signup-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button className="signup-register-btn" id="signup-register-btn" type="submit">Register</button>
              </form>

              <p className="signup-login-link">
                Already have an account? <a href="#login" id="signup-login" onClick={(e) => { e.preventDefault(); setShowSignup(false); setShowLogin(true); }}>Login</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {showLogin && (
        <div className="signup-overlay" id="login-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowLogin(false) }}>
          <div className="signup-modal" id="login-modal">
            <button className="signup-close" id="login-close" onClick={() => setShowLogin(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="signup-left">
              <div className="signup-left-content">
                <div className="signup-brand">
                  <svg className="signup-brand-icon" viewBox="0 0 40 40" fill="none">
                    <circle cx="14" cy="14" r="8" stroke="white" strokeWidth="2.5" fill="none" />
                    <circle cx="26" cy="14" r="8" stroke="white" strokeWidth="2.5" fill="none" />
                  </svg>
                  <div>
                    <div className="signup-brand-name">BorrowBuddy</div>
                    <div className="signup-brand-sub">Borrow & Return Tracker</div>
                  </div>
                </div>
                <p className="signup-tagline">Share items. Build better habits.</p>
                <div className="signup-categories">
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                    </svg>
                    <span>Books</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 2v4M17 2v4" />
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M12 10v4" />
                    </svg>
                    <span>Chargers</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                    </svg>
                    <span>Tools</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    <span>Sports</span>
                  </div>
                  <div className="signup-cat-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="6" cy="12" r="1" />
                      <circle cx="18" cy="12" r="1" />
                    </svg>
                    <span>And more...</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="signup-right">
              <h2 className="signup-title">Welcome Back</h2>
              <p className="signup-subtitle-blue">Log in to your account</p>

              <form className="signup-form" id="login-form" onSubmit={handleLogin}>
                {authMessage.text && (
                  <div className={`auth-message ${authMessage.type}`}>
                    {authMessage.text}
                  </div>
                )}
                <div className="signup-field">
                  <label className="signup-label" htmlFor="login-email">Email address</label>
                  <input
                    className="signup-input"
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  />
                </div>

                <div className="signup-field">
                  <label className="signup-label" htmlFor="login-password">Password</label>
                  <div className="signup-password-wrapper">
                    <svg className="signup-password-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <input
                      className="signup-input signup-input-password"
                      id="login-password"
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="signup-password-toggle"
                      id="login-password-toggle"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showLoginPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="login-options">
                  <label className="login-remember" id="login-remember">
                    <input type="checkbox" />
                    <span>Remember me</span>
                  </label>
                  <a href="#forgot" className="login-forgot" id="login-forgot">Forgot password?</a>
                </div>

                <button className="signup-register-btn" id="login-submit-btn" type="submit">Login</button>
              </form>

              <p className="signup-login-link">
                Don't have an account? <a href="#signup" id="login-signup" onClick={(e) => { e.preventDefault(); setShowLogin(false); setShowSignup(true); }}>Sign up</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
      )}
    </div>
  )
}

export default App
