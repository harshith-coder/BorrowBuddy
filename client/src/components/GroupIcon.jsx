const iconContent = {
  back: <path d="m15 18-6-6 6-6" />,
  people: <><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  chevron: <path d="m7 10 5 5 5-5" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
  department: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3" /></>,
  laptop: <><rect x="4" y="4" width="16" height="12" rx="1" /><path d="M2 20h20" /></>,
  headphones: <><path d="M3 14v-3a9 9 0 0 1 18 0v3" /><rect x="3" y="13" width="4" height="7" rx="2" /><rect x="17" y="13" width="4" height="7" rx="2" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h8" /></>,
  usb: <><path d="M12 3v13m0-13 3 3m-3-3L9 6" /><path d="M12 10h5l2 2v4m-7-3H7l-2 2v2" /><circle cx="5" cy="19" r="2" /><rect x="17" y="16" width="4" height="5" rx="1" /></>,
  mouse: <><rect x="6" y="2" width="12" height="20" rx="6" /><path d="M12 2v6" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
  borrow: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  check: <><circle cx="12" cy="12" r="10" /><path d="m7 12 3 3 7-7" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
  trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
}

const GroupIcon = ({ name, className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {iconContent[name] || iconContent.box}
  </svg>
)

export default GroupIcon
