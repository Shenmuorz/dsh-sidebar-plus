window.__ModuleLoader__.load({
  id: '@local/sidebar-plus',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    let createPortal = null
    try {
      const reactDom = require('react-dom')
      if (reactDom && typeof reactDom.createPortal === 'function') createPortal = reactDom.createPortal
    } catch { /* the loader may not expose react-dom; the menu falls back to an in-flow bar */ }

    const token = () => (window.__DSH_SIDEBAR_PLUS__ && window.__DSH_SIDEBAR_PLUS__.token) || ''

    async function call(action, body) {
      const response = await fetch('/sidebar-plus/' + action, {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        headers: body === undefined ? {} : { 'content-type': 'application/json', 'x-sidebar-plus': token() },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || ('HTTP ' + response.status))
      return payload
    }


      const GLASS_CSS = [
        '[class*="_frame"]{background:' +
          'radial-gradient(50% 40% at 4% 0%, rgba(111,156,255,.42), transparent 60%),' +
          'radial-gradient(44% 36% at 100% 10%, rgba(255,158,196,.34), transparent 62%),' +
          'radial-gradient(50% 42% at 84% 100%, rgba(99,224,200,.32), transparent 64%),' +
          'linear-gradient(160deg,#f3f6fd 0%,#eef1f9 50%,#f5eef9 100%) !important;' +
          'background-attachment:fixed !important}' +
        '[class*="_sidebarCol"],[class*="_centerCol"]{background:transparent !important}' +
        '[class*="_sidebarCol"] [class*="_root"],[class*="_centerCol"] [class*="_root"]{background:transparent !important}' +
        '[class*="_centerCol"] [class*="_page"]{background:transparent !important}' +
        '[role="dialog"],[aria-modal="true"],[class*="_dialog"]:not([class*="Button"]):not([class*="Body"]):not([class*="Note"]):not([class*="Error"]){' +
          'background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 58%, transparent) !important;' +
          'backdrop-filter:blur(30px) saturate(1.45);-webkit-backdrop-filter:blur(30px) saturate(1.45);' +
          'box-shadow:inset 0 1px 0 rgba(255,255,255,.45), 0 22px 54px rgba(16,24,40,.16) !important;' +
          'border:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 45%, transparent) !important}' +
        '[data-sp-collapse]{opacity:.55;transition:opacity .18s ease}' +
        '[data-sp-collapse]:hover,[class*="_sidebarCol"]:hover [data-sp-collapse]{opacity:1}' +
        '[class*="_sidebarCol"]{border-right:1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 35%, transparent) !important}'      ].join('\n')

    const store = {
      open: false,
      listeners: new Set(),
      set(next) { store.open = next; store.listeners.forEach((fn) => fn(store.open)) },
      subscribe(fn) { store.listeners.add(fn); return () => store.listeners.delete(fn) },
    }
    const useOpen = () => {
      const [open, setOpen] = React.useState(store.open)
      React.useEffect(() => store.subscribe(setOpen), [])
      return open
    }

    function TrashIcon({ size }) {
      const s = size || 16
      return h('svg', {
        width: s, height: s, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true,
      },
      h('path', { d: 'M4 7h16' }),
      h('path', { d: 'M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7' }),
      h('path', { d: 'M6.5 7l.9 11.1A1.9 1.9 0 0 0 9.3 20h5.4a1.9 1.9 0 0 0 1.9-1.9L17.5 7' }),
      h('path', { d: 'M10 11v5M14 11v5' }))
    }

    const Chevron = ({ open }) => h('span', {
      style: {
        display: 'inline-block', width: 10, color: 'var(--dsw-alias-label-secondary)',
        fontSize: 9, opacity: 0.9, transform: open ? 'rotate(90deg)' : 'none',
        transition: 'transform .12s ease',
      },
    }, '▶')

    const SectionTitle = ({ children, actions }) => h('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px',
        color: 'var(--dsw-alias-label-primary)', fontSize: 13.5, letterSpacing: '.01em', fontWeight: 600,
      },
    }, h('span', null, children), h('span', { style: { flex: 1 } }), actions || null)

    const toolBtn = {
      border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-secondary)',
      cursor: 'pointer', fontSize: 13.5, padding: '2px 5px', borderRadius: 5, lineHeight: 1,
    }

    function titleOf(row) {
      if (!row) return ''
      if (typeof row.displayTitle === 'string' && row.displayTitle.trim()) return row.displayTitle
      const values = row.projectionValues || (row.projections && row.projections.values) || {}
      const value = values.title
      if (typeof value === 'string') return value
      if (value && typeof value === 'object' && typeof value.title === 'string') return value.title
      return ''
    }

    function relTime(ts) {
      if (!ts) return ''
      const diff = Date.now() - Number(ts)
      if (!isFinite(diff) || diff < 0) return ''
      const min = Math.floor(diff / 60000)
      if (min < 1) return '刚刚'
      if (min < 60) return min + ' 分钟'
      const hour = Math.floor(min / 60)
      if (hour < 24) return hour + ' 小时'
      return Math.floor(hour / 24) + ' 天'
    }

    function createBrowser(ctx) {
      return function Browser(props) {
        const snap = props.useWorkspaces((s) => s) || {}
        const list = props.useSessions((s) => s) || {}
        const items = snap.items || []
        const byId = list.byId || {}
        const archived = new Set(snap.archivedSessionIds || [])

        const [expanded, setExpanded] = React.useState(() => {
          try { return JSON.parse(window.localStorage.getItem('sidebar-plus:expanded') || '[]') } catch { return [] }
        })
        const [recycle, setRecycle] = React.useState(null)
        const [recycleOpen, setRecycleOpen] = React.useState(false)
        const [hoverId, setHoverId] = React.useState(null)
        const [menuId, setMenuId] = React.useState(null)
        const [menuPos, setMenuPos] = React.useState(null)
        const [hoverWs, setHoverWs] = React.useState(null)
        const [dragId, setDragId] = React.useState(null)
        const [dropAt, setDropAt] = React.useState(null)
        const [overRecycle, setOverRecycle] = React.useState(false)
        const [dragRecycle, setDragRecycle] = React.useState(null)
        const [overWs, setOverWs] = React.useState(null)
        const rootRef = React.useRef(null)
        const [narrow, setNarrow] = React.useState(false)
        React.useEffect(() => {
          const host = document.querySelector('[class*="_sidebarCol"]') || (rootRef.current && rootRef.current.parentElement)
          if (!host || typeof ResizeObserver === 'undefined') return undefined
          const measure = () => setNarrow(host.getBoundingClientRect().width < 96)
          measure()
          const ro = new ResizeObserver(measure)
          ro.observe(host)
          return () => ro.disconnect()
        }, [])
        const [query, setQuery] = React.useState('')
        const [searching, setSearching] = React.useState(false)

        React.useEffect(() => {
          try { window.localStorage.setItem('sidebar-plus:expanded', JSON.stringify(expanded)) } catch { /* ignore */ }
        }, [expanded])

        React.useEffect(() => {
          let alive = true
          call('list').then((p) => { if (alive) setRecycle(p.items || []) }).catch(() => { if (alive) setRecycle([]) })
          return () => { alive = false }
        }, [])

        const allExpanded = items.length > 0 && items.every((w) => expanded.includes(w.workspaceId))
        const toggle = (id) => setExpanded((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.concat(id))
        const openSession = (id) => { try { ctx.uiWorkspace.openSession(id) } catch (error) { console.error('[sidebar-plus] openSession', error) } }

        const archive = async (id) => {
          setMenuId(null)
          try { await ctx.uiWorkspace.archiveSession(id) }
          catch (error) { window.alert('归档失败：' + (error && error.message ? error.message : '宿主拒绝了这次归档')) }
        }

        const remove = async (id) => {
          setMenuId(null)
          const title = titleOf(byId[id])
          try {
            try { await ctx.uiWorkspace.archiveSession(id) } catch { /* host may refuse; files still move */ }
            await call('delete', { sessionId: id, title })
            const p = await call('list')
            setRecycle(p.items || [])
            setMenuId(null)
          } catch (error) { window.alert('移到回收区失败：' + error.message) }
        }

        const purge = async (item) => {
          const name = item.title || item.id
          if (!window.confirm('彻底删除「' + name + '」？删除后无法恢复。')) return
          try {
            await call('purge', { sessionId: item.id })
            const p = await call('list')
            setRecycle(p.items || [])
          } catch (error) { window.alert('删除失败：' + error.message) }
        }
        const restore = async (id, targetWorkspaceId) => {
          try {
            const r = await call('restore', { sessionId: id })
            const target = targetWorkspaceId || (r && r.workspaceId)
            if (target) {
              try { await ctx.workspaces.unarchiveSession(id) } catch { /* not archived */ }
              try { await ctx.workspaces.insertSessionBefore(target, id) }
              catch (error) { console.error('[sidebar-plus] insertSessionBefore', error) }
              try { await ctx.sessions.refreshProjections(id) } catch { /* ignore */ }
            }
            const p = await call('list')
            setRecycle(p.items || [])
          } catch (error) { window.alert('恢复失败：' + error.message) }
        }

        const addWorkspace = async () => {
          try {
            const path = await ctx.uiWorkspace.pickDirectory()
            if (path) await ctx.workspaces.create({ path })
          } catch { /* ignore */ }
        }

        const rowsOf = (workspace) => (workspace.sessionIds || [])
          .filter((id) => !archived.has(id) && byId[id])
          .map((id) => ({ id, summary: byId[id] }))

        const reorder = async (workspaceId, movedId, beforeId) => {
          if (!workspaceId || !movedId || movedId === beforeId) return
          try {
            await ctx.workspaces.insertSessionBefore(workspaceId, movedId, beforeId)
          } catch (error) { console.error('[sidebar-plus] reorder', error) }
          setDragId(null)
          setDropAt(null)
        }

        const sessionRow = (id, summary, workspaceId, index, open) => {
          const title = titleOf(summary) || '未命名对话'
          const dropHere = dropAt && dropAt.id === id ? dropAt : null
          const menuOpen = menuId === id
          const menuBody = menuOpen
            ? h('div', {
              onClick: (event) => event.stopPropagation(),
              style: createPortal
                ? {
                  position: 'fixed',
                  left: menuPos ? menuPos.x : 8,
                  top: menuPos ? menuPos.y : 8,
                  zIndex: 90, minWidth: 140,
                  background: 'var(--dsw-alias-bg-overlay)',
                  border: '1px solid var(--dsw-alias-border-l2)',
                  borderRadius: 10, padding: 4,
                  boxShadow: '0 14px 34px rgba(0,0,0,.22)',
                }
                : {
                  display: 'flex', gap: 4, margin: '2px 0 2px 22px',
                  background: 'var(--dsw-alias-bg-overlay)',
                  border: '1px solid var(--dsw-alias-border-l2)',
                  borderRadius: 9, padding: 4,
                },
            },
            [{ label: '归档', run: () => archive(id) }, { label: '移到回收区', run: () => remove(id) }].map((action) =>
              h('button', {
                key: action.label, type: 'button',
                onClick: (event) => { event.stopPropagation(); action.run() },
                style: {
                  display: 'block', width: '100%', textAlign: 'left', padding: '6px 9px',
                  border: 'none', borderRadius: 6, background: 'transparent', cursor: 'pointer',
                  color: 'var(--dsw-alias-label-primary)', font: 'inherit', fontSize: 13.5,
                  whiteSpace: 'nowrap',
                },
              }, action.label)))
            : null
          const menuNode = menuBody && createPortal ? createPortal(menuBody, document.body) : menuBody
          const time = relTime(summary && summary.updatedAt)
          const running = !!(summary && summary.running)
          const hovered = hoverId === id
          return h('div', {
            key: id,
            draggable: true,
            onDragStart: (event) => {
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', id)
              setDragId(id)
            },
            onDragEnd: () => { setDragId(null); setDropAt(null) },
            onDragOver: (event) => {
              if (!dragId || dragId === id) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              const rect = event.currentTarget.getBoundingClientRect()
              const after = event.clientY > rect.top + rect.height / 2
              setDropAt((cur) => (cur && cur.id === id && cur.after === after ? cur : { id, after }))
            },
            onDrop: async (event) => {
              event.preventDefault()
              const moved = dragId
              const after = !!(dropAt && dropAt.id === id && dropAt.after)
              setDropAt(null)
              if (!moved || moved === id) return
              const ids = rowsOf(items.find((w) => w.workspaceId === workspaceId) || { sessionIds: [] }).map((r) => r.id)
              const at = ids.indexOf(id)
              const beforeId = after ? ids[at + 1] : id
              await reorder(workspaceId, moved, beforeId)
            },
            onClick: () => openSession(id),
            onMouseEnter: () => setHoverId(id),
            onMouseLeave: () => setHoverId((cur) => (cur === id ? null : cur)),
            style: {
              position: 'relative', display: 'flex', alignItems: 'center', gap: 7,
              minHeight: 29, padding: '3px 22px 3px 8px', borderRadius: 7, cursor: 'pointer',
              color: 'var(--dsw-alias-label-secondary)', fontSize: 13.5,
              background: hovered ? 'color-mix(in srgb, var(--dsw-alias-bg-layer-1) 72%, transparent)' : 'transparent',
              opacity: dragId === id ? .45 : (open ? 1 : 0),
              transform: open ? 'none' : 'translateY(-6px) scale(.97)',
              transformOrigin: 'top center',
              transition: 'opacity .26s ease, transform .4s cubic-bezier(.2,.9,.25,1.14), background .16s ease',
              transitionDelay: open ? Math.min(index, 8) * 26 + 'ms' : '0ms',
              willChange: 'transform, opacity',
              boxShadow: dropHere
                ? (dropHere.after ? 'inset 0 -2px 0 0 var(--dsw-alias-brand-primary)' : 'inset 0 2px 0 0 var(--dsw-alias-brand-primary)')
                : undefined,
            },
          },
          h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, title),
          time ? h('span', { style: { fontSize: 12, opacity: .75, whiteSpace: 'nowrap' } }, time) : null,
          running ? h('span', { style: { width: 5, height: 5, borderRadius: 4, background: 'var(--dsw-alias-state-warn-primary)' } }) : null,
          h('button', {
            type: 'button', title: '更多',
            onClick: (event) => {
              event.stopPropagation()
              if (menuId === id) { setMenuId(null); return }
              const rect = event.currentTarget.getBoundingClientRect()
              setMenuPos({
                x: Math.max(8, Math.min(rect.right - 140, window.innerWidth - 152)),
                y: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 84)),
              })
              setMenuId(id)
            },
            style: {
              position: 'absolute', right: 3, top: 3, width: 20, height: 22,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--dsw-alias-label-secondary)', fontSize: 14,
              opacity: hovered || menuId === id ? 1 : 0,
            },
          }, '⋯'),
          menuNode)
        }

        const workspaceRow = (workspace) => {
          const open = expanded.includes(workspace.workspaceId)
          const count = (workspace.sessionIds || []).filter((id) => !archived.has(id)).length
          return h('div', { key: workspace.workspaceId },
            h('div', {
              onClick: () => toggle(workspace.workspaceId),
              onDragOver: (event) => {
                if (!dragRecycle) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                if (overWs !== workspace.workspaceId) setOverWs(workspace.workspaceId)
              },
              onDragLeave: () => setOverWs((cur) => (cur === workspace.workspaceId ? null : cur)),
              onDrop: async (event) => {
                event.preventDefault()
                setOverWs(null)
                const moved = dragRecycle
                setDragRecycle(null)
                if (moved) await restore(moved, workspace.workspaceId)
              },
              onMouseEnter: () => setHoverWs(workspace.workspaceId),
              onMouseLeave: () => setHoverWs((cur) => (cur === workspace.workspaceId ? null : cur)),
              style: {
                display: 'flex', alignItems: 'center', gap: 7, minHeight: 29,
                padding: '3px 8px', borderRadius: 7, cursor: 'pointer',
                color: 'var(--dsw-alias-label-primary)', fontSize: 13.5, fontWeight: 600,
                outline: overWs === workspace.workspaceId ? '1px dashed var(--dsw-alias-brand-primary)' : 'none',
                background: overWs === workspace.workspaceId ? 'var(--dsw-alias-bg-layer-1)' : 'transparent',
              },
            },
            h(Chevron, { open }),
            h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
              workspace.title || workspace.path || '工作区'),
            hoverWs === workspace.workspaceId ? h('button', {
              type: 'button', title: '在这里新建对话',
              onClick: (event) => {
                event.stopPropagation()
                try { ctx.uiWorkspace.startSession(workspace.workspaceId) }
                catch (error) { console.error('[sidebar-plus] startSession', error) }
              },
              style: { ...toolBtn, fontSize: 14, lineHeight: 1 },
            }, '＋') : h('span', { style: { fontSize: 12, opacity: .7 } }, String(count))),
            h('div', {
              style: {
                display: 'grid',
                gridTemplateRows: open ? '1fr' : '0fr',
                opacity: open ? 1 : 0,
                transition: 'grid-template-rows .46s cubic-bezier(.22,.9,.24,1.08), opacity .28s ease',
              },
            },
            h('div', { style: { overflow: 'hidden' } },
              h('div', { style: { marginLeft: 17, paddingLeft: 6, borderLeft: '1px solid var(--dsw-alias-border-l1)' } },
                rowsOf(workspace).map((row, index) => sessionRow(row.id, row.summary, workspace.workspaceId, index, open)),
                h('div', {
                  style: { height: 12 },
                  onDragOver: (event) => { if (dragId) event.preventDefault() },
                  onDrop: async (event) => {
                    event.preventDefault()
                    const moved = dragId
                    setDropAt(null)
                    if (moved) await reorder(workspace.workspaceId, moved, undefined)
                  },
                })))))
        }

        if (narrow) {
          return h('div', {
            ref: rootRef,
            title: '展开侧边栏',
            onClick: () => { try { ctx.layout.toggleSidebar() } catch { /* ignore */ } },
            style: {
              flex: '1 1 auto', alignSelf: 'stretch', minHeight: 120, margin: '6px 2px',
              borderRadius: 14, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
              border: '1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 40%, transparent)',
              background: 'color-mix(in srgb, var(--dsw-alias-bg-layer-1) 55%, transparent)',
              backdropFilter: 'blur(24px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4), 0 8px 22px rgba(16,24,40,.10)',
              color: 'var(--dsw-alias-label-secondary)', fontSize: 13,
            },
          },
          h('span', { style: { fontSize: 15, opacity: .8 } }, '»'),
          h('span', { style: { writingMode: 'vertical-rl', letterSpacing: '.12em', fontSize: 11, opacity: .75 } }, '展开'))
        }

        return h('div', {
          ref: rootRef,
          style: {
            position: 'relative',
            display: 'flex', flexDirection: 'column', gap: 18, padding: '12px 32px 10px 8px',
            margin: '6px 4px 8px', flex: '1 1 auto', alignSelf: 'stretch', minHeight: 0,
            overflowY: 'auto', overflowX: 'hidden',
            borderRadius: 20,
            border: '1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 45%, transparent)',
            background: 'color-mix(in srgb, var(--dsw-alias-bg-layer-1) 58%, transparent)',
            backdropFilter: 'blur(26px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(26px) saturate(1.5)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.5), 0 12px 30px rgba(16,24,40,.10)',
          },
        },
        h('button', {
          'data-sp-collapse': '',
          type: 'button',
          title: '收起侧边栏',
          onClick: (event) => { event.stopPropagation(); try { ctx.layout.toggleSidebar() } catch { /* ignore */ } },
          style: {
            position: 'absolute', right: 4, top: 10, bottom: 10, width: 24, padding: 0,
            border: '1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 40%, transparent)',
            borderRadius: 12, cursor: 'pointer', zIndex: 5,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'color-mix(in srgb, var(--dsw-alias-bg-layer-1) 62%, transparent)',
            color: 'var(--dsw-alias-label-secondary)', fontSize: 12, lineHeight: 1,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4)',
          },
        },
        h('span', { style: { fontSize: 14, opacity: .9 } }, '«'),
        h('span', { style: { writingMode: 'vertical-rl', letterSpacing: '.14em', fontSize: 11, opacity: .8 } }, '收起')),
        h('div', {
          'aria-hidden': true,
          style: {
            position: 'absolute', inset: 0, borderRadius: 20, pointerEvents: 'none', zIndex: 0,
            background:
              'radial-gradient(58% 42% at 8% 2%, rgba(111,156,255,.34), transparent 62%),' +
              'radial-gradient(52% 38% at 100% 18%, rgba(255,158,196,.28), transparent 64%),' +
              'radial-gradient(58% 44% at 76% 100%, rgba(99,224,200,.26), transparent 66%)',
          },
        }),
        h('div', null,
          h(SectionTitle, null, '功能区'),
          h('div', { style: { marginTop: 2 } },
            [['plugins', '插件', '✥'], ['schedules', '自动化任务', '◷'], ['dsh-context', '上下文洞察', '◧']].map(([pid, label, glyph]) =>
              h('div', {
                key: pid,
                onClick: () => { try { ctx.layout.selectPanel(pid) } catch (error) { console.error('[sidebar-plus] selectPanel', error) } },
                style: {
                  display: 'flex', alignItems: 'center', gap: 8, minHeight: 29, padding: '3px 8px',
                  borderRadius: 7, cursor: 'pointer', color: 'var(--dsw-alias-label-primary)', fontSize: 13.5,
                },
              },
              h('span', { style: { width: 14, textAlign: 'center', color: 'var(--dsw-alias-label-secondary)' } }, glyph),
              h('span', { style: { flex: 1 } }, label))))),
        h('div', null,
          h(SectionTitle, {
            actions: h('span', { style: { display: 'flex', alignItems: 'center', gap: 1 } },
              h('button', {
                type: 'button', style: toolBtn,
                title: allExpanded ? '全部折叠' : '全部展开',
                onClick: () => setExpanded(allExpanded ? [] : items.map((w) => w.workspaceId)),
              }, allExpanded ? '⊟' : '⊞'),
              h('button', {
                type: 'button', style: toolBtn, title: '搜索会话',
                onClick: () => { setSearching((v) => !v); setQuery('') },
              }, searching ? '×' : '⌕'),
              h('button', { type: 'button', style: toolBtn, title: '添加工作区', onClick: addWorkspace }, '＋')),
          }, '工作区'),
          searching ? h('div', { style: { padding: '4px 4px 2px' } },
            h('input', {
              autoFocus: true,
              value: query,
              placeholder: '搜索会话标题…',
              onChange: (event) => setQuery(event.target.value),
              onKeyDown: (event) => { if (event.key === 'Escape') { setSearching(false); setQuery('') } },
              style: {
                width: '100%', boxSizing: 'border-box', height: 28, padding: '0 8px',
                borderRadius: 7, border: '1px solid var(--dsw-alias-border-l2)',
                background: 'var(--dsw-alias-bg-layer-1)', color: 'var(--dsw-alias-label-primary)',
                font: 'inherit', fontSize: 13.5, outline: 'none',
              },
            })) : null,
          h('div', { style: { marginTop: 2 } },
            query.trim()
              ? (() => {
                const flat = []
                items.forEach((w) => rowsOf(w).forEach((r) => flat.push({ id: r.id, summary: r.summary })))
                const q = query.trim().toLowerCase()
                const hits = flat.filter((r) => (titleOf(r.summary) || '').toLowerCase().includes(q))
                if (hits.length === 0) return h('div', { style: { padding: '6px 8px', fontSize: 13, color: 'var(--dsw-alias-label-secondary)' } }, '没有匹配的会话')
                return hits.map((r) => sessionRow(r.id, r.summary))
              })()
              : items.map(workspaceRow))),

        h('div', { style: { borderTop: '1px solid var(--dsw-alias-border-l1)', paddingTop: 12 } },
          h('div', {
            onClick: () => setRecycleOpen((v) => !v),
            onDragOver: (event) => {
              if (!dragId) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              if (!overRecycle) setOverRecycle(true)
            },
            onDragLeave: () => setOverRecycle(false),
            onDrop: async (event) => {
              event.preventDefault()
              setOverRecycle(false)
              const moved = dragId
              setDragId(null)
              setDropAt(null)
              if (moved) await remove(moved)
            },
            style: {
              display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0 4px',
              borderRadius: 7, outline: overRecycle ? '1px dashed var(--dsw-alias-brand-primary)' : 'none',
              background: overRecycle ? 'var(--dsw-alias-bg-layer-1)' : 'transparent',
            },
          },
          h(SectionTitle, {
            actions: h('span', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
              (recycle && recycle.length) ? h('button', {
                type: 'button', title: '清空回收区',
                onClick: async (event) => {
                  event.stopPropagation()
                  if (!window.confirm('彻底清空回收区？其中的对话将无法恢复。')) return
                  try { await call('empty', {}); setRecycle([]) }
                  catch (error) { window.alert('清空失败：' + error.message) }
                },
                style: { ...toolBtn, color: 'var(--dsw-alias-label-secondary)' },
              }, '清空') : null,
              h('span', { style: { fontSize: 12 } }, recycle ? String(recycle.length) : ''),
              h(Chevron, { open: recycleOpen })),
          }, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } }, h(TrashIcon, { size: 12 }), '回收区'))),
          recycleOpen ? h('div', { style: { marginTop: 4 } },
            (recycle || []).length === 0
              ? h('div', { style: { padding: '6px 8px', fontSize: 13, color: 'var(--dsw-alias-label-secondary)' } }, '回收区是空的')
              : (recycle || []).map((item) => h('div', {
                key: item.id,
                draggable: true,
                onDragStart: (event) => {
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', item.id)
                  setDragRecycle(item.id)
                },
                onDragEnd: () => { setDragRecycle(null); setOverWs(null) },
                style: {
                  display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', fontSize: 13,
                  color: 'var(--dsw-alias-label-secondary)', borderRadius: 7, cursor: 'grab',
                  opacity: dragRecycle === item.id ? .45 : 1,
                },
              },
              h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, item.title || item.id),
              h('button', {
                type: 'button', onClick: () => restore(item.id),
                style: { ...toolBtn, color: 'var(--dsw-alias-brand-primary)' },
              }, '恢复'),
              h('button', {
                type: 'button',
                title: '彻底删除，不可恢复',
                onClick: () => purge(item),
                style: { ...toolBtn, color: 'var(--dsw-alias-label-secondary)' },
              }, '删除')))) : null))
      }
    }

    class Boundary extends React.Component {
      constructor(props) { super(props); this.state = { error: null } }
      static getDerivedStateFromError(error) { return { error } }
      componentDidCatch(error) { try { console.error('[sidebar-plus]', error) } catch { /* ignore */ } }
      render() {
        if (this.state.error) {
          return h('div', { style: { padding: 10, fontSize: 13, color: 'var(--dsw-alias-state-error-primary)' } },
            '侧边栏加载失败：' + String((this.state.error && this.state.error.message) || this.state.error),
            h('div', { style: { marginTop: 6, color: 'var(--dsw-alias-label-secondary)' } },
              '可在 设置 → 插件 里关闭 Sidebar Plus 恢复官方侧边栏。'))
        }
        return this.props.children
      }
    }

    function RecycleButton() {
      const [count, setCount] = React.useState(null)
      const [hover, setHover] = React.useState(false)
      const open = useOpen()

      React.useEffect(() => {
        let alive = true
        call('list').then((p) => { if (alive) setCount((p.items || []).length) }).catch(() => { if (alive) setCount(null) })
        return () => { alive = false }
      }, [open])

      return h('button', {
        type: 'button', title: '回收区', 'aria-label': '回收区',
        onClick: () => store.set(true),
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        style: {
          display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 6px',
          flex: '0 0 auto', border: 'none', borderRadius: 7,
          background: hover ? 'var(--dsw-alias-bg-layer-2)' : 'transparent',
          color: hover ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
          cursor: 'pointer', font: 'inherit', fontSize: 14, whiteSpace: 'nowrap', lineHeight: 1,
        },
      },
      h(TrashIcon, { size: 16 }),
      h('span', { style: { whiteSpace: 'nowrap' } }, '回收区'),
      count ? h('span', {
        style: {
          minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8,
          background: 'var(--dsw-alias-state-error-primary)', color: '#fff',
          fontSize: 10, lineHeight: '16px', textAlign: 'center',
        },
      }, String(count)) : null)
    }

    function RecycleOverlay() {
      const open = useOpen()
      const [items, setItems] = React.useState(null)
      const [error, setError] = React.useState('')
      const [busy, setBusy] = React.useState(false)

      const refresh = React.useCallback(async () => {
        try { const p = await call('list'); setItems(p.items || []); setError('') }
        catch (err) { setItems([]); setError(err.message) }
      }, [])

      React.useEffect(() => {
        if (!open) return undefined
        refresh()
        const onKey = (event) => { if (event.key === 'Escape') store.set(false) }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [open, refresh])

      if (!open) return null
      const close = () => store.set(false)

      const restore = async (id) => {
        setBusy(true)
        try {
          const r = await call('restore', { sessionId: id })
          if (r && r.workspaceId) {
            try { await ctx.workspaces.unarchiveSession(id) } catch { /* ignore */ }
            try { await ctx.workspaces.insertSessionBefore(r.workspaceId, id) } catch { /* ignore */ }
            try { await ctx.sessions.refreshProjections(id) } catch { /* ignore */ }
          }
          await refresh()
        } catch (err) { setError(err.message) }
        setBusy(false)
      }
      const empty = async () => {
        if (!window.confirm('彻底清空回收区？其中的对话将无法恢复。')) return
        setBusy(true)
        try { await call('empty', {}); await refresh() } catch (err) { setError(err.message) }
        setBusy(false)
      }

      return h('div', {
        onClick: close,
        style: { position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.38)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
      },
      h('div', {
        onClick: (e) => e.stopPropagation(), role: 'dialog', 'aria-label': '回收区',
        style: {
          width: 520, maxWidth: 'calc(100vw - 48px)', maxHeight: '70vh', overflow: 'auto',
          background: 'var(--dsw-alias-bg-overlay)', color: 'var(--dsw-alias-label-primary)',
          border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 14,
          boxShadow: '0 18px 48px rgba(0,0,0,.45)', padding: 18,
        },
      },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 } },
        h('span', { style: { display: 'flex', color: 'var(--dsw-alias-label-secondary)' } }, h(TrashIcon, { size: 18 })),
        h('div', { style: { fontSize: 14, fontWeight: 600 } }, '回收区'),
        h('div', { style: { flex: 1 } }),
        h('button', {
          type: 'button', disabled: busy || !items || items.length === 0, onClick: empty,
          style: { padding: '5px 10px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', color: 'var(--dsw-alias-state-error-primary)' },
        }, '清空'),
        h('button', {
          type: 'button', onClick: close,
          style: { width: 26, height: 26, borderRadius: 7, cursor: 'pointer', border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-secondary)', fontSize: 15, lineHeight: '24px' },
        }, '✕')),
      h('div', { style: { fontSize: 13, color: 'var(--dsw-alias-label-secondary)', marginBottom: 10 } },
        items === null ? '读取中…' : (items.length ? items.length + ' 个对话在回收区，恢复后会回到原来的工作区' : '回收区是空的')),
      error ? h('div', { style: { fontSize: 13, color: 'var(--dsw-alias-state-error-primary)', marginBottom: 10 } }, '读取失败：' + error) : null,
      (items || []).map((item) => h('div', {
        key: item.id,
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 11px', border: '1px solid var(--dsw-alias-border-l1)', borderRadius: 10, background: 'var(--dsw-alias-bg-layer-2)', marginBottom: 6 },
      },
      h('div', { style: { minWidth: 0 } },
        h('div', { style: { fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, item.id),
        h('div', { style: { fontSize: 13.5, color: 'var(--dsw-alias-label-secondary)', marginTop: 2 } }, '删除于 ' + new Date(item.deletedAt).toLocaleString())),
      h('button', {
        type: 'button', disabled: busy, onClick: () => restore(item.id),
        style: { padding: '5px 10px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', color: 'var(--dsw-alias-label-primary)' },
      }, '恢复')))))
    }

    function DeleteToRecycle(props) {
      const title = props.displayTitle || '这个对话'
      const [busy, setBusy] = React.useState(false)
      const onClick = async () => {
        if (busy) return
        setBusy(true)
        try { await call('delete', { sessionId: props.sessionId }); window.location.reload() }
        catch (error) { setBusy(false); window.alert('移到回收区失败：' + error.message) }
      }
      return h('button', {
        type: 'button', role: 'menuitem', disabled: busy, onClick,
        style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', border: 'none', borderRadius: 6, background: 'transparent', color: 'var(--dsw-alias-label-primary)', font: 'inherit', fontSize: 14, textAlign: 'left', cursor: 'pointer' },
      }, busy ? '正在移动…' : '移到回收区')
    }

    return {
      inject: ['slots', 'uiWorkspace', 'layout', 'workspaces', 'sessions'],
      apply(ctx) {
        try {
          const style = document.createElement('style')
          style.setAttribute('data-sidebar-plus', 'glass')
          style.textContent = GLASS_CSS
          document.head.appendChild(style)
          ctx.effect(() => () => style.remove())
        } catch { /* ignore */ }

        try {
          const style = document.createElement('style')
          style.textContent = '[class*="_panelList"]{display:none !important}'
          document.head.appendChild(style)
          ctx.effect(() => () => style.remove())
        } catch { /* ignore */ }
        const Browser = createBrowser(ctx)
        const SafeBrowser = (props) => h(Boundary, null, h(Browser, props))

        ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register({
          name: 'sidebar.workspaces',
          id: 'sidebar-plus-browser',
          priority: -1,
        }, SafeBrowser))

        ctx.slots.inject('sidebar.workspaces.session.menu.item', () => ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'sidebar-plus-recycle',
          order: 500,
        }, DeleteToRecycle))

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'sidebar-plus-recycle-panel',
          order: 900,
        }, RecycleOverlay))
      },
    }
  },
})
