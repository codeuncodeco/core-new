/**
 * Click-to-edit script for the /edit/proposals/<slug> route.
 *
 * - Walks every element with [data-edit-path], makes it contenteditable.
 * - On blur, parses the edited text (number coercion when
 *   data-edit-type="number") and PATCHes the change to the CMS via the
 *   /api/proposal-edit/save endpoint on this app (which forwards the
 *   editor's auth cookie to Payload).
 * - For nested paths like `costItems.2.amount`, sends the entire top-level
 *   array (Payload doesn't patch single rows in place).
 * - Writes back into the local snapshot so the next blur on a sibling
 *   field sends consistent state.
 *
 * UI: a small status pill in the bottom-right shows idle/saving/saved/error.
 */

type Snapshot = Record<string, unknown> & { id: string | number }

const dataNode = document.getElementById('proposal-data')
if (!dataNode || !dataNode.textContent) {
  console.warn('[proposal-editor] no #proposal-data on page; aborting')
} else {
  const snapshot = JSON.parse(dataNode.textContent) as Snapshot
  initEditor(snapshot)
}

function initEditor(snapshot: Snapshot) {
  injectStyles()
  const status = mountStatusPill()

  for (const el of document.querySelectorAll<HTMLElement>('[data-edit-path]')) {
    const path = el.dataset.editPath!
    const type = el.dataset.editType ?? 'string'

    el.contentEditable = 'true'
    el.classList.add('editable-field')

    el.addEventListener('focus', () => {
      el.classList.add('editable-field--focused')
    })

    el.addEventListener('blur', async () => {
      el.classList.remove('editable-field--focused')

      const raw = (el.textContent ?? '').replace(/ /g, ' ').trim()
      const parsed = type === 'number' ? Number(raw) : raw

      if (type === 'number' && !Number.isFinite(parsed as number)) {
        // Bad number — revert to whatever was last in the snapshot.
        el.textContent = String(getByPath(snapshot, path) ?? '')
        status.set('error', 'Number expected')
        return
      }

      const previous = getByPath(snapshot, path)
      if (previous === parsed) return // no-op, skip the round-trip

      setByPath(snapshot, path, parsed)
      const topKey = path.split('.')[0]!

      status.set('saving', 'Saving…')
      try {
        const res = await fetch('/api/proposal-edit/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: snapshot.id,
            patch: { [topKey]: snapshot[topKey] },
          }),
        })
        if (!res.ok) {
          const errBody = await res.text()
          throw new Error(errBody || `${res.status} ${res.statusText}`)
        }
        status.set('saved', 'Saved')
      } catch (err) {
        // Roll back local snapshot so the next edit doesn't compound the error.
        setByPath(snapshot, path, previous)
        status.set('error', (err as Error).message || 'Save failed')
      }
    })

    // Enter key on a single-line field should blur (and save) rather than
    // insert a newline. Multi-line fields (textarea-ish, like overview /
    // descriptions) keep newline behaviour.
    el.addEventListener('keydown', (e) => {
      const isMultilineField =
        path === 'overview' || /\.description$/.test(path) || /\.notes$/.test(path)
      if (e.key === 'Enter' && !e.shiftKey && !isMultilineField) {
        e.preventDefault()
        ;(e.target as HTMLElement).blur()
      }
      if (e.key === 'Escape') {
        // Bail out without saving.
        const original = getByPath(snapshot, path)
        ;(e.target as HTMLElement).textContent = String(original ?? '')
        ;(e.target as HTMLElement).blur()
      }
    })
  }
}

// --------------- helpers ---------------

function getByPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj
  for (const seg of path.split('.')) {
    if (cur == null) return undefined
    const key: string | number = /^\d+$/.test(seg) ? Number(seg) : seg
    cur = (cur as Record<string | number, unknown>)[key]
  }
  return cur
}

function setByPath(obj: unknown, path: string, value: unknown): void {
  const segs = path.split('.')
  let cur: unknown = obj
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i]!
    const key: string | number = /^\d+$/.test(seg) ? Number(seg) : seg
    cur = (cur as Record<string | number, unknown>)[key]
  }
  const last = segs[segs.length - 1]!
  const key: string | number = /^\d+$/.test(last) ? Number(last) : last
  ;(cur as Record<string | number, unknown>)[key] = value
}

type StatusKind = 'idle' | 'saving' | 'saved' | 'error'

function mountStatusPill() {
  const pill = document.createElement('div')
  pill.id = 'proposal-editor-status'
  pill.dataset.state = 'idle'
  pill.textContent = 'Click to edit'
  document.body.appendChild(pill)

  let timer: ReturnType<typeof setTimeout> | null = null
  return {
    set(state: StatusKind, message?: string) {
      if (timer) clearTimeout(timer)
      pill.dataset.state = state
      pill.textContent = message ?? defaultMessage(state)
      // Auto-fade "saved" back to idle after 2s.
      if (state === 'saved') {
        timer = setTimeout(() => {
          pill.dataset.state = 'idle'
          pill.textContent = defaultMessage('idle')
        }, 2000)
      }
    },
  }
}

function defaultMessage(state: StatusKind): string {
  switch (state) {
    case 'idle':
      return 'Click to edit'
    case 'saving':
      return 'Saving…'
    case 'saved':
      return 'Saved'
    case 'error':
      return 'Save failed'
  }
}

function injectStyles() {
  const style = document.createElement('style')
  style.textContent = `
    [data-edit-path] {
      transition: background-color 120ms ease;
      border-radius: 3px;
      outline: none;
      cursor: text;
    }
    [data-edit-path]:hover {
      background: rgba(0, 0, 0, 0.04);
    }
    [data-edit-path]:focus,
    [data-edit-path].editable-field--focused {
      background: rgba(255, 200, 100, 0.18);
      box-shadow: 0 0 0 2px rgba(255, 150, 50, 0.4);
    }
    #proposal-editor-status {
      position: fixed;
      bottom: 16px;
      right: 16px;
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 13px;
      background: rgba(20, 20, 20, 0.85);
      color: white;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      pointer-events: none;
      transition: background-color 200ms ease;
    }
    #proposal-editor-status[data-state="saving"] { background: rgba(60, 60, 200, 0.9); }
    #proposal-editor-status[data-state="saved"]  { background: rgba(40, 140, 60, 0.9); }
    #proposal-editor-status[data-state="error"]  { background: rgba(180, 40, 40, 0.95); }
    @media print {
      #proposal-editor-status { display: none; }
      [data-edit-path] { background: transparent !important; box-shadow: none !important; }
    }
  `
  document.head.appendChild(style)
}
