'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ENGINE_LABEL,
  ENGINES,
  type Bookmark,
  type Engine,
  type HistoryItem,
} from '@/lib/types';
import { hostnameOf, normalizeUrl, searchUrl } from '@/lib/url';

type View = 'history' | 'links';

export default function SearchApp() {
  const [engine, setEngine] = useState<Engine>('ddg');
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [view, setView] = useState<View>('history');
  const [label, setLabel] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [commandArmed, setCommandArmed] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const historyRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const bookmarkRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const commandArmedRef = useRef(false);

  /** Wait one tick so a focus target exists after a view switch re-renders. */
  const focusLater = (getNode: () => HTMLElement | null | undefined) => {
    window.setTimeout(() => getNode()?.focus(), 0);
  };

  const flash = (text: string) => setMessage(text);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [historyResponse, bookmarksResponse] = await Promise.all([
        fetch('/api/history', { cache: 'no-store' }),
        fetch('/api/bookmarks', { cache: 'no-store' }),
      ]);
      if (!historyResponse.ok || !bookmarksResponse.ok) {
        throw new Error('Could not load cloud data. Check the Supabase environment variables.');
      }
      const historyData = await historyResponse.json();
      const bookmarksData = await bookmarksResponse.json();
      setHistory(historyData.items ?? []);
      setBookmarks(bookmarksData.items ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const runSearch = useCallback(async (text: string, selectedEngine: Engine) => {
    const value = text.trim();
    if (!value) {
      flash('Type something to search.');
      searchRef.current?.focus();
      return;
    }

    let target = '';
    if (selectedEngine === 'url') {
      const normalized = normalizeUrl(value);
      if (!normalized) {
        flash('Enter a valid web address (http or https).');
        searchRef.current?.focus();
        return;
      }
      target = normalized;
    } else {
      target = searchUrl(selectedEngine, value);
    }

    // Save the search, but never let a storage failure block navigation.
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: value, engine: selectedEngine }),
      });
    } catch {
      // Search still works without history.
    }

    window.location.href = target;
  }, []);

  const addBookmark = useCallback(async () => {
    const cleanLabel = label.trim();
    const normalized = normalizeUrl(urlInput);

    if (!cleanLabel) {
      flash('Give the link a name.');
      labelRef.current?.focus();
      return;
    }
    if (!normalized) {
      flash('Enter a valid web address (http or https).');
      return;
    }

    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: cleanLabel, url: normalized }),
      });
      if (!response.ok) throw new Error('Could not save the link.');
      setLabel('');
      setUrlInput('');
      setMessage('Link saved.');
      await loadAll();
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Could not save the link.');
    }
  }, [label, urlInput, loadAll]);

  const makeBookmarkFromHistory = useCallback((item: HistoryItem) => {
    const target = searchUrl(item.engine, item.query);
    if (!target) {
      flash('This history item has no valid URL.');
      return;
    }
    setLabel(item.query);
    setUrlInput(target);
    setView('links');
    setMessage('Edit the name if you like, then press Add.');
    focusLater(() => labelRef.current);
  }, []);

  const removeHistory = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete.');
      setHistory((current) => current.filter((item) => item.id !== id));
    } catch {
      flash('Could not delete that entry.');
    }
  }, []);

  const clearHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/history?all=1', { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not clear.');
      setHistory([]);
      setMessage('History cleared.');
    } catch {
      flash('Could not clear history.');
    }
  }, []);

  const removeBookmark = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/bookmarks?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete.');
      setBookmarks((current) => current.filter((item) => item.id !== id));
    } catch {
      flash('Could not delete that link.');
    }
  }, []);

  const openBookmark = useCallback((item: Bookmark) => {
    window.location.href = normalizeUrl(item.url) ?? item.url;
  }, []);

  const focusRow = (rows: Array<HTMLButtonElement | null>, index: number) => {
    if (!rows.length) return;
    const next = Math.max(0, Math.min(rows.length - 1, index));
    rows[next]?.focus();
  };

  const goToHistoryRow = (index: number) => {
    setView('history');
    focusLater(() => historyRefs.current[index] ?? null);
  };

  const setCommandArmedState = (armed: boolean) => {
    commandArmedRef.current = armed;
    setCommandArmed(armed);
  };

  /** 1-3 select the search mode, 4-5 select the panel. */
  const applyShortcut = useCallback((digit: number) => {
    if (digit >= 1 && digit <= 3) {
      setEngine(ENGINES[digit - 1]);
    } else if (digit === 4) {
      setView('history');
    } else if (digit === 5) {
      setView('links');
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable === true;
      const key = event.key;

      // Arm a one-shot command prefix. Needed while typing so digits stay usable
      // as normal characters in a search query.
      if (key === '*' || key === '#') {
        event.preventDefault();
        setCommandArmedState(true);
        setMessage('Command: press 1-5');
        return;
      }

      if (commandArmedRef.current) {
        if (/^[1-5]$/.test(key)) {
          event.preventDefault();
          applyShortcut(Number(key));
        }
        setCommandArmedState(false);
        return;
      }

      // Feature phones cannot always focus the buttons, so digits also work
      // directly whenever a text field is not being edited.
      if (/^[1-5]$/.test(key) && !editing) {
        event.preventDefault();
        applyShortcut(Number(key));
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'k') {
        event.preventDefault();
        goToHistoryRow(-1);
        focusLater(() => searchRef.current);
        return;
      }

      if (key === '/' && !editing) {
        event.preventDefault();
        goToHistoryRow(-1);
        focusLater(() => searchRef.current);
        return;
      }

      if (key === 'Escape') {
        if (editing) (target as HTMLInputElement).blur();
        if (commandArmedRef.current) setCommandArmedState(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [applyShortcut]);

  return (
    <main className="app">
      <a className="skip" href="#search-input">
        Skip to search
      </a>

      <div className="header">
        <span className="brand">Cloud Search</span>
        <div className="segment" role="group" aria-label="Search mode">
          {ENGINES.map((option, index) => (
            <button
              key={option}
              type="button"
              className={`seg${engine === option ? ' active' : ''}`}
              aria-pressed={engine === option}
              aria-keyshortcuts={String(index + 1)}
              onClick={() => setEngine(option)}
            >
              <span className="key-hint">{index + 1}</span>
              <span>{ENGINE_LABEL[option]}</span>
            </button>
          ))}
        </div>
      </div>

      <form
        className="search-row"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch(query, engine);
        }}
      >
        <input
          id="search-input"
          ref={searchRef}
          className="search-input"
          type="text"
          inputMode={engine === 'url' ? 'url' : 'search'}
          enterKeyHint="go"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={engine === 'url' ? 'https://site.com' : 'Search…'}
          aria-label={engine === 'url' ? 'Website address' : 'Search query'}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && history.length) {
              event.preventDefault();
              goToHistoryRow(0);
            }
          }}
        />
        <button className="go" type="submit" aria-label="Search or open address">
          Go
        </button>
      </form>

      <div className="hint">1-3 mode · 4/5 view · * + digit in field · / focus</div>
      <div className="status" role="status" aria-live="polite">
        {commandArmed ? 'Command: press 1-5' : loading ? 'Loading…' : message}
      </div>

      <div className="segment views" role="group" aria-label="Panel">
        {(['history', 'links'] as View[]).map((option, index) => (
          <button
            key={option}
            type="button"
            className={`view${view === option ? ' active' : ''}`}
            aria-pressed={view === option}
            aria-keyshortcuts={String(index + 4)}
            onClick={() => setView(option)}
          >
            <span className="key-hint">{index + 4}</span>
            <span>{option === 'history' ? 'History' : 'Links'}</span>
          </button>
        ))}
      </div>

      <div className="panel">
        {view === 'history' ? (
          <>
            <button className="clear" type="button" onClick={() => void clearHistory()}>
              Clear all
            </button>
            <div className="list" aria-label="Search history">
              {!loading && history.length === 0 && (
                <div className="empty">No searches yet.</div>
              )}
              {history.map((item, index) => (
                <div className="row" key={item.id}>
                  <button
                    ref={(node) => {
                      historyRefs.current[index] = node;
                    }}
                    className="row-main"
                    type="button"
                    title={`Run search: ${item.query}`}
                    onClick={() => void runSearch(item.query, item.engine)}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        focusRow(historyRefs.current, index + 1);
                      } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        if (index === 0) searchRef.current?.focus();
                        else focusRow(historyRefs.current, index - 1);
                      }
                    }}
                  >
                    {item.query}
                  </button>
                  <span className="tag" aria-hidden="true">
                    {ENGINE_LABEL[item.engine]}
                  </span>
                  <button
                    className="icon-btn"
                    type="button"
                    title="Save as bookmark"
                    aria-label={`Save ${item.query} as bookmark`}
                    onClick={() => makeBookmarkFromHistory(item)}
                  >
                    ☆
                  </button>
                  <button
                    className="icon-btn danger"
                    type="button"
                    title="Delete"
                    aria-label={`Delete ${item.query} from history`}
                    onClick={() => void removeHistory(item.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="add-form">
              <input
                ref={labelRef}
                className="add-input"
                type="text"
                placeholder="Name"
                aria-label="Bookmark name"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void addBookmark();
                  }
                }}
              />
              <div className="add-url-row">
                <input
                  className="add-input"
                  type="url"
                  inputMode="url"
                  placeholder="https://site.com"
                  aria-label="Bookmark address"
                  value={urlInput}
                  onChange={(event) => setUrlInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void addBookmark();
                    }
                  }}
                />
                <button className="add-btn" type="button" onClick={() => void addBookmark()}>
                  Add
                </button>
              </div>
            </div>
            <div className="list" aria-label="Bookmarks">
              {!loading && bookmarks.length === 0 && (
                <div className="empty">No links saved.</div>
              )}
              {bookmarks.map((item, index) => (
                <div className="row" key={item.id}>
                  <button
                    ref={(node) => {
                      bookmarkRefs.current[index] = node;
                    }}
                    className="row-main bookmark"
                    type="button"
                    title={item.url}
                    onClick={() => openBookmark(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        focusRow(bookmarkRefs.current, index + 1);
                      } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        if (index === 0) labelRef.current?.focus();
                        else focusRow(bookmarkRefs.current, index - 1);
                      }
                    }}
                  >
                    <span className="bm-label">{item.label}</span>
                    <span className="bm-host">{hostnameOf(item.url)}</span>
                  </button>
                  <button
                    className="icon-btn danger"
                    type="button"
                    title="Delete"
                    aria-label={`Delete bookmark ${item.label}`}
                    onClick={() => void removeBookmark(item.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
