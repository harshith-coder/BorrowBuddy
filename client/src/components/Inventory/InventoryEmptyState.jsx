import GroupIcon from '../GroupIcon'

function InventoryEmptyState({ onAddItem }) {
  return <>
    <section className="inventory-empty-state">
      <svg className="inventory-illustration" viewBox="0 0 420 250" role="img" aria-label="A box holding books, headphones, and a bottle">
        <path d="M54 112c0-43 31-74 78-76 40-2 58 14 88-2 31-17 72-9 92 16 20 24 19 46 53 65 43 24 45 68 20 92-16 16-40 21-79 20H112c-35 0-60-15-64-42-3-21 9-39 6-73Z" fill="#f2f0eb" />
        <g stroke="#102b54" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M93 104h231l29 37v84c0 8-7 14-15 14H114c-8 0-14-6-14-14v-95Z" fill="#fffdf8" />
          <path d="m93 104-28 43 74 18 24-61M324 104l47 38-48 9" fill="#fffdf8" />
          <path d="M101 132h222v93c0 8-6 14-14 14H116c-8 0-15-6-15-14Z" fill="#fffdf8" />
          <path d="m210 160 24-14 24 14-24 14Z" fill="#edf2f8" />
          <path d="M210 160v28l24 14v-28M258 160v28l-24 14" fill="#edf2f8" />
          <path d="M111 59c0-9 8-16 17-16h82v27h-82c-9 0-17-5-17-11ZM111 80c0-8 8-14 17-14h82v27h-82c-9 0-17-5-17-13Z" fill="#fffdf8" />
          <path d="M210 43h30v50h-30" fill="#fffdf8" />
          <path d="M192 108V86a52 52 0 0 1 104 0v22" fill="none" />
          <path d="M192 90h13v37h-13c-7 0-12-5-12-12v-13c0-7 5-12 12-12ZM296 90h-13v37h13c7 0 12-5 12-12v-13c0-7-5-12-12-12Z" fill="#91a9c6" />
          <path d="M320 49h25l-4 14-9 5-11 34h-28l16-42 11-5Z" fill="#fffdf8" />
          <path d="m359 21 10-18M383 39l18-11M390 61h20" />
        </g>
      </svg>
      <h2>Build your group's inventory</h2>
      <p>Add items you're willing to share with your group — books, gadgets, sports gear, or anything else. Your friends can then borrow these items from you easily.</p>
      <button type="button" className="inventory-primary inventory-empty-add" onClick={onAddItem}><span>＋</span>Add Item</button>
    </section>
    <section className="inventory-features">
      <article><span><GroupIcon name="box" /></span><div><strong>Add your item</strong><p>List the items you can lend</p></div></article>
      <article><span><GroupIcon name="people" /></span><div><strong>Share with friends</strong><p>Keep your group updated.</p></div></article>
      <article><span><GroupIcon name="borrow" /></span><div><strong>Borrow &amp; Lend easily</strong><p>Request, lend and manage items<br />within your group</p></div></article>
    </section>
  </>
}

export default InventoryEmptyState
