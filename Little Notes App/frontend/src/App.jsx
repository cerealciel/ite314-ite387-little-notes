import { useCallback, useEffect, useRef, useState } from 'react';

const emptyForm = { title: '', body: '', categoryId: '' };
const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'The request could not be completed.');
  return payload;
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

function isNotePinned(note) {
  return note?.isPinned === true || Number(note?.isPinned) === 1;
}

function PencilIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m13.8 3.2 3 3-9.6 9.6-3.7.7.7-3.7 9.6-9.6Z" /><path d="m11.9 5.1 3 3M4 16l3-.7" /></svg>;
}

function TrashIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4.5 6h11l-.7 10.2H5.2L4.5 6ZM3.5 4.5h13M8 4.5V3h4v1.5M8 8.5v5M12 8.5v5" /></svg>;
}

function PinIcon() {
  return <svg className="pin-icon" aria-hidden="true" viewBox="0 0 24 24"><g transform="rotate(32 12 12)"><rect x="7" y="2" width="10" height="4.8" rx="1.8" /><path d="M9.5 6.3h5l1.1 6.5H8.4z" /><rect x="5" y="12.3" width="14" height="4" rx="1.8" /><path d="M11.25 16h1.5v6.2L12 23.7l-.75-1.5z" /></g></svg>;
}

function ArchiveIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M3 5h14v12H3zM2 3h16v3H2zM7 9h6" /></svg>;
}

function RestoreIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 8a6.5 6.5 0 1 1-.3 4M4 4v4h4M10 7v4l3 2" /></svg>;
}

export default function App() {
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [view, setView] = useState('active');
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem('little-notes-theme') === 'dark');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortValue, setSortValue] = useState('updatedAt:desc');
  const [pendingNoteId, setPendingNoteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmNote, setDeleteConfirmNote] = useState(null);
  const [deleteConfirmError, setDeleteConfirmError] = useState('');
  const [deletingNote, setDeletingNote] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const editorOpener = useRef(null);
  const deleteConfirmOpener = useRef(null);
  const deletingNoteRef = useRef(false);
  const menuOpener = useRef(null);
  const menuPanel = useRef(null);
  const filtersRef = useRef({});
  const [retryKey, setRetryKey] = useState(0);

  filtersRef.current = { view, search, categoryFilter, sortValue };
  deletingNoteRef.current = deletingNote;

  const fetchNotes = useCallback(async (filters = filtersRef.current, signal) => {
    const [sort, order] = filters.sortValue.split(':');
    const query = new URLSearchParams({ view: filters.view, sort, order });
    if (filters.search.trim()) query.set('q', filters.search.trim());
    if (filters.categoryFilter) query.set('categoryId', filters.categoryFilter);
    return request(`/api/notes?${query.toString()}`, { signal });
  }, []);

  const loadNotes = useCallback(async (filters = filtersRef.current) => {
    const result = await fetchNotes(filters);
    setNotes(result.notes);
  }, [fetchNotes]);

  const loadWorkspace = useCallback(async () => {
    try {
      const categoryResult = await request('/api/categories');
      setCategories(categoryResult.categories);
      setCategoryError('');
      setForm((current) => current.categoryId ? current : {
        ...current,
        categoryId: String(categoryResult.categories[0]?.id || ''),
      });
    } catch (requestError) {
      setCategoryError(requestError.message);
    }
  }, []);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  useEffect(() => {
    window.localStorage.setItem('little-notes-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setLoadError('');
      try {
        const result = await fetchNotes(undefined, controller.signal);
        if (!controller.signal.aborted) setNotes(result.notes);
      } catch (requestError) {
        if (!controller.signal.aborted) setLoadError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search.trim() ? 220 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [view, search, categoryFilter, sortValue, retryKey, fetchNotes]);

  useEffect(() => {
    if (!editorOpen && editorOpener.current instanceof HTMLElement) {
      editorOpener.current.focus();
      editorOpener.current = null;
    }
  }, [editorOpen]);

  useEffect(() => {
    if (!editorOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape' && !saving) closeEditor();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [editorOpen, saving]);

  useEffect(() => {
    if (!deleteConfirmNote) {
      if (deleteConfirmOpener.current instanceof HTMLElement) {
        const opener = deleteConfirmOpener.current;
        deleteConfirmOpener.current = null;
        if (opener.isConnected) opener.focus();
        else document.querySelector('.view-tab[aria-pressed="true"]')?.focus();
      }
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = document.getElementById('delete-confirmation');
    dialog?.querySelector('#delete-confirm-cancel')?.focus();
    function handleConfirmationKeys(event) {
      if (event.key === 'Escape') {
        if (!deletingNoteRef.current) setDeleteConfirmNote(null);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.querySelectorAll('button:not(:disabled)')];
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
        event.preventDefault();
        focusable[0].focus();
      }
    }
    window.addEventListener('keydown', handleConfirmationKeys);
    return () => {
      window.removeEventListener('keydown', handleConfirmationKeys);
      document.body.style.overflow = previousOverflow;
    };
  }, [deleteConfirmNote]);

  useEffect(() => {
    if (!menuOpen) {
      if (menuOpener.current instanceof HTMLElement) {
        menuOpener.current.focus();
        menuOpener.current = null;
      }
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    menuPanel.current?.querySelector('button')?.focus();
    function handleMenuKeys(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...menuPanel.current.querySelectorAll('button:not(:disabled)')];
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault();
        focusable.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
        event.preventDefault();
        focusable[0].focus();
      }
    }
    window.addEventListener('keydown', handleMenuKeys);
    return () => {
      window.removeEventListener('keydown', handleMenuKeys);
      document.body.style.overflow = previousOverflow;
      if (menuOpener.current instanceof HTMLElement) menuOpener.current.focus();
    };
  }, [menuOpen]);

  function startNewNote() {
    editorOpener.current = menuOpen ? menuOpener.current : document.activeElement;
    menuOpener.current = null;
    setMenuOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm, categoryId: String(categories[0]?.id || '') });
    setError('');
    setMessage('');
    setEditorOpen(true);
  }

  function startEdit(note) {
    editorOpener.current = document.activeElement;
    setEditingId(note.id);
    setForm({ title: note.title, body: note.body, categoryId: String(note.categoryId) });
    setError('');
    setMessage('');
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm, categoryId: String(categories[0]?.id || '') });
    setError('');
  }

  async function submitNote(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = { ...form, categoryId: Number(form.categoryId) };
      if (editingId !== null) {
        await request(`/api/notes/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        setMessage('Note updated.');
      } else {
        await request('/api/notes', { method: 'POST', body: JSON.stringify(payload) });
        setMessage('Note saved to your collection.');
      }
      await loadNotes();
      setEditorOpen(false);
      setEditingId(null);
      setForm({ ...emptyForm, categoryId: String(categories[0]?.id || '') });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  function openDeleteConfirmation(note) {
    if (isNotePinned(note)) {
      setMessage('Unpin this note before moving it to Trash.');
      return;
    }
    deleteConfirmOpener.current = document.activeElement;
    setDeleteConfirmError('');
    setDeleteConfirmNote(note);
  }

  async function deleteNote() {
    if (!deleteConfirmNote) return;
    if (isNotePinned(deleteConfirmNote)) {
      setDeleteConfirmError('Unpin this note before moving it to Trash.');
      return;
    }
    setDeletingNote(true);
    setDeleteConfirmError('');
    try {
      await request(`/api/notes/${deleteConfirmNote.id}`, { method: 'DELETE' });
      await loadNotes();
      setDeleteConfirmNote(null);
      setMessage('Note moved to Trash.');
    } catch (deleteError) {
      setDeleteConfirmError(deleteError.message);
    } finally {
      setDeletingNote(false);
    }
  }

  async function changeNoteState(note, changes, successMessage) {
    setPendingNoteId(note.id);
    setError('');
    setMessage('');
    try {
      await request(`/api/notes/${note.id}`, { method: 'PATCH', body: JSON.stringify(changes) });
      await loadNotes();
      setMessage(successMessage);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setPendingNoteId(null);
    }
  }

  async function restoreNote(note) {
    setPendingNoteId(note.id);
    setError('');
    setMessage('');
    try {
      await request(`/api/notes/${note.id}/restore`, { method: 'POST' });
      await loadNotes();
      setMessage('Note restored.');
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setPendingNoteId(null);
    }
  }

  function clearFilters() {
    setSearch('');
    setCategoryFilter('');
    setSortValue('updatedAt:desc');
  }

  function openMenu(event) {
    menuOpener.current = event.currentTarget;
    setMenuOpen(true);
  }

  function selectMenuView(nextView) {
    setView(nextView);
    setCategoryFilter('');
    setSearch('');
    setMenuOpen(false);
  }

  function selectMenuCategory(categoryId) {
    setView('active');
    setCategoryFilter(categoryId);
    setSearch('');
    setMenuOpen(false);
  }

  function retryLoading() {
    setRetryKey((key) => key + 1);
    loadWorkspace();
  }

  const hasFilters = Boolean(search.trim() || categoryFilter);

  return (
    <div className={`app-shell ${darkMode ? 'dark-mode' : ''}`}>
      <header className="sky-header">
        <nav className="topbar" aria-label="Main navigation">
          <button className="menu-trigger" type="button" aria-label="Open navigation menu" aria-expanded={menuOpen} aria-controls="notes-drawer" onClick={openMenu}>
            <span /><span /><span />
          </button>
          <a className="brand" href="#top" aria-label="Little Notes home">
            <span className="brand-name">little notes</span>
          </a>
        </nav>
        <section className="sky-hero" id="top">
          <div className="hero-copy">
            <span className="hero-kicker">YOUR OWN LITTLE CORNER</span>
            <h1>Your ideas,<br /><span>right where you need them.</span></h1>
            <p>Keep a thought, make a plan, remember the small things.</p>
          </div>
          <div className="sky-art" aria-hidden="true">
            <span className="sun" />
            <span className="cloud cloud-one" />
            <span className="cloud cloud-two" />
            <span className="cloud cloud-three" />
            <svg className="paper-plane plane-one" viewBox="0 0 64 48"><path d="M3 20 60 2 39 45 29 29 3 20Z"/><path d="m29 29 31-27"/></svg>
            <svg className="paper-plane plane-two" viewBox="0 0 64 48"><path d="M3 20 60 2 39 45 29 29 3 20Z"/><path d="m29 29 31-27"/></svg>
            <span className="plane-trail trail-one" />
            <span className="sky-doodle">✧</span>
          </div>
        </section>
      </header>

      <main className="content-panel">
        <div className="main-content">
          <section className="list-heading" aria-labelledby="notes-heading">
            <div>
              <span className="section-kicker">THE THINGS YOU WANT TO KEEP</span>
              <h2 id="notes-heading">{view === 'active' ? 'Your notes' : view === 'archived' ? 'Archived notes' : 'Trash'} <span className="note-count">{notes.length}</span></h2>
            </div>
          </section>

          <div className="category-legend" aria-label="Note categories">
            {categories.map((category) => (
              <span className="legend-item" key={category.id}><i style={{ backgroundColor: category.color }} />{category.name}</span>
            ))}
          </div>

          <nav className="notes-toolbar" aria-label="Note views and filters">
            <div className="view-tabs" role="group" aria-label="Choose note view">
              {['active', 'archived', 'trash'].map((item) => (
                <button type="button" className={`view-tab ${view === item ? 'selected' : ''}`} key={item} aria-pressed={view === item} onClick={() => setView(item)}>
                  {item === 'active' ? 'My notes' : item === 'archived' ? 'Archived' : 'Trash'}
                </button>
              ))}
            </div>
            <div className="filter-controls">
              <label className="search-control"><span className="visually-hidden">Search notes</span><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes" /></label>
              <label><span className="visually-hidden">Filter by category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label><span className="visually-hidden">Sort notes</span><select value={sortValue} onChange={(event) => setSortValue(event.target.value)}><option value="updatedAt:desc">Recently updated</option><option value="createdAt:desc">Recently created</option><option value="title:asc">Title A–Z</option><option value="title:desc">Title Z–A</option></select></label>
            </div>
          </nav>

          {categoryError && <div className="feedback error" role="alert">Categories could not load: {categoryError} <button type="button" onClick={retryLoading}>Retry</button></div>}

          {(error || message) && <div className={error ? 'feedback error' : 'feedback success'} role="status">{error || message}</div>}

          {loading ? (
            <div className="empty-state loading-state" role="status" aria-live="polite"><span className="loading-spinner" aria-hidden="true" /><p>Gathering your notes…</p></div>
          ) : loadError ? (
            <div className="empty-state load-error-state" role="alert">
              <div className="empty-cloud" aria-hidden="true"><span>!</span></div>
              <h3>Your notes didn’t load.</h3>
              <p>{loadError}</p>
              <button className="empty-create" onClick={retryLoading}>Try again <span>→</span></button>
            </div>
          ) : notes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-cloud" aria-hidden="true" />
              <h3>{hasFilters ? 'No notes match those filters.' : view === 'archived' ? 'Nothing tucked away yet.' : view === 'trash' ? 'Your trash is empty.' : 'A fresh page, just for you.'}</h3>
              <p>{hasFilters ? 'Try a different search or category.' : view === 'active' ? 'Your first note can be a task, a reminder, or a thought you don’t want to lose.' : view === 'archived' ? 'Notes you archive will be kept here.' : 'Deleted notes will stay here until restored.'}</p>
              {hasFilters ? <button className="empty-create" onClick={clearFilters}>Clear filters <span>→</span></button> : view === 'active' ? <button className="empty-create" onClick={startNewNote}>Write your first note <span>→</span></button> : null}
            </div>
          ) : (
            <div className="notes-list">
              {notes.map((note) => (
                <article className={`note-row ${isNotePinned(note) ? 'pinned' : ''}`} key={note.id} style={{ '--category-color': note.categoryColor }}>
                  <span className="note-marker" aria-hidden="true"><i /></span>
                  <div className="note-content">
                    <div className="note-title-line"><h3>{note.title}</h3>{isNotePinned(note) && <span className="pinned-label">Pinned</span>}<span className="note-category">{note.categoryName}</span></div>
                    <p>{note.body || 'No extra details yet.'}</p>
                  </div>
                  <time className="note-date" dateTime={note.updatedAt}>{formatDate(note.updatedAt)}</time>
                  <div className="note-actions">
                    {view === 'trash' ? (
                      <button className="icon-button restore-button" aria-label={`Restore ${note.title}`} title="Restore note" disabled={pendingNoteId === note.id} onClick={() => restoreNote(note)}><RestoreIcon /></button>
                    ) : (
                      <>
                        <button className={`icon-button pin-button ${isNotePinned(note) ? 'is-pinned' : ''}`} aria-label={isNotePinned(note) ? `Unpin ${note.title}` : `Pin ${note.title}`} aria-pressed={isNotePinned(note)} title={isNotePinned(note) ? 'Unpin note' : 'Pin note'} disabled={pendingNoteId === note.id} onClick={() => changeNoteState(note, { isPinned: !isNotePinned(note) }, isNotePinned(note) ? 'Note unpinned.' : 'Note pinned.')}><PinIcon /></button>
                        <button className="icon-button archive-button" aria-label={view === 'archived' ? `Move ${note.title} to My notes` : `Archive ${note.title}`} title={view === 'archived' ? 'Move to My notes' : 'Archive note'} disabled={pendingNoteId === note.id} onClick={() => changeNoteState(note, { isArchived: view !== 'archived' }, view === 'archived' ? 'Note moved to My notes.' : 'Note archived.')}><ArchiveIcon /></button>
                        <button className="icon-button edit-button" aria-label={`Edit ${note.title}`} title="Edit note" onClick={() => startEdit(note)}><PencilIcon /></button>
                        <button className={`icon-button delete-button ${isNotePinned(note) ? 'is-disabled' : ''}`} aria-label={isNotePinned(note) ? `Unpin ${note.title} before moving it to Trash` : `Move ${note.title} to Trash`} aria-disabled={isNotePinned(note)} title={isNotePinned(note) ? 'Unpin this note before moving it to Trash' : 'Move to Trash'} onClick={() => openDeleteConfirmation(note)}><TrashIcon /></button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <div className={`drawer-layer ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <button className="drawer-scrim" type="button" aria-label="Close navigation menu" tabIndex={menuOpen ? 0 : -1} onClick={() => setMenuOpen(false)} />
        <aside className="notes-drawer" id="notes-drawer" ref={menuPanel} role="dialog" aria-modal="true" aria-label="Little Notes navigation" inert={!menuOpen}>
          <div className="drawer-heading"><div><span className="drawer-eyebrow">YOUR LITTLE SPACE</span><h2>Where to?</h2></div><button className="close-button" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}><svg className="drawer-close-icon" aria-hidden="true" viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15" /></svg></button></div>
          <button className="drawer-create" type="button" onClick={startNewNote}><span className="drawer-create-icon"><span className="drawer-create-plus">＋</span></span><span><strong>Write a note</strong><small>Save a thought or make a plan</small></span><span className="drawer-arrow">→</span></button>
          <nav className="drawer-navigation" aria-label="Note folders">
            <span className="drawer-section-label">YOUR PAGES</span>
            {['active', 'archived', 'trash'].map((item) => <button type="button" className={`drawer-link ${view === item ? 'selected' : ''}`} key={item} aria-current={view === item ? 'page' : undefined} onClick={() => selectMenuView(item)}><span className={`drawer-link-icon ${item}`}>{item === 'active' ? <PencilIcon /> : item === 'archived' ? <ArchiveIcon /> : <TrashIcon />}</span>{item === 'active' ? 'My notes' : item === 'archived' ? 'Archived' : 'Trash'}<span className="drawer-link-arrow">›</span></button>)}
          </nav>
          <div className="drawer-categories"><span className="drawer-section-label">BY CATEGORY</span><button type="button" className={`drawer-category ${categoryFilter === '' && view === 'active' ? 'selected' : ''}`} onClick={() => selectMenuCategory('')}><i className="all-category-dot" />All categories</button>{categories.map((category) => <button type="button" className={`drawer-category ${categoryFilter === String(category.id) && view === 'active' ? 'selected' : ''}`} key={category.id} onClick={() => selectMenuCategory(String(category.id))}><i style={{ backgroundColor: category.color }} />{category.name}</button>)}</div>
          <div className="drawer-theme-setting">
            <span className="theme-setting-icon" aria-hidden="true">{darkMode ? '☾' : '☼'}</span>
            <span className="theme-setting-copy"><strong>Dark mode</strong><small>{darkMode ? 'A softer night palette' : 'Switch to a softer night palette'}</small></span>
            <button className="theme-switch" type="button" role="switch" aria-checked={darkMode} aria-label="Dark mode" onClick={() => setDarkMode((enabled) => !enabled)}><span /></button>
          </div>
          <div className="drawer-footer"><p>A small space for everything on your mind.</p></div>
        </aside>
      </div>

      <footer className="app-footer"><span>Take it one little thing at a time.</span></footer>

      <button className="floating-add" onClick={startNewNote} aria-label="Create a new note" title="New note"><span className="floating-add-plus" aria-hidden="true">＋</span></button>

      {editorOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) closeEditor(); }}>
          <section className="note-editor" role="dialog" aria-modal="true" aria-labelledby="editor-heading" aria-describedby="editor-description">
            <div className="editor-topline"><span className="section-kicker">A FRESH LITTLE PAGE</span><button type="button" className="close-button" aria-label="Close editor" onClick={closeEditor} disabled={saving}>×</button></div>
            <h2 id="editor-heading">{editingId !== null ? 'Edit your note' : 'What’s on your mind?'}</h2>
            <p className="editor-subtitle" id="editor-description">Write it down now. You can tidy it up later.</p>
            <form onSubmit={submitNote}>
              <label htmlFor="note-title">Title</label>
              <input id="note-title" autoFocus maxLength="120" placeholder="A name for this thought" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
              <label htmlFor="note-body">Your note</label>
              <textarea id="note-body" rows="5" placeholder="Write a little more here…" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} required />
              <label htmlFor="note-category">Category</label>
              <select id="note-category" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} required>
                <option value="" disabled>Choose a category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              {error && <div className="feedback error editor-error" role="alert">{error}</div>}
              <div className="editor-actions"><button type="button" className="cancel-button" onClick={closeEditor} disabled={saving}>Cancel</button><button className="save-button" type="submit" disabled={saving || categories.length === 0}>{saving ? 'Saving…' : editingId !== null ? 'Save changes' : 'Save note'} <span>→</span></button></div>
            </form>
          </section>
        </div>
      )}

      {deleteConfirmNote && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletingNote) setDeleteConfirmNote(null); }}>
          <section className="delete-confirmation" id="delete-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="delete-confirmation-heading" aria-describedby="delete-confirmation-description">
            <div className="delete-confirmation-icon" aria-hidden="true"><TrashIcon /></div>
            <h2 id="delete-confirmation-heading">Move this note to Trash?</h2>
            <p id="delete-confirmation-description">Are you sure you want to move <strong>{deleteConfirmNote.title}</strong> to Trash? You can restore it later.</p>
            {deleteConfirmError && <div className="feedback error" role="alert">{deleteConfirmError}</div>}
            <div className="confirmation-actions">
              <button id="delete-confirm-cancel" className="cancel-button" type="button" disabled={deletingNote} onClick={() => setDeleteConfirmNote(null)}>Keep note</button>
              <button className="move-to-trash-button" type="button" disabled={deletingNote} onClick={deleteNote}>{deletingNote ? 'Moving…' : 'Move to Trash'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
