import { promises as fs, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

export const inject = ['webServer']

const ROUTE_PREFIX = '/sidebar-plus'
const LEGACY_PREFIX = '/api/sidebar-plus'

export function apply(ctx) {
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
  const stores = path.join(home, 'storages')
  const sessionsRoot = path.join(home, 'sessions')
  const workspaceFile = path.join(stores, 'workspace.json')
  const recycleRoot = path.join(stores, 'recycle')
  const tokenFile = path.join(home, 'sidebar-plus-token')
  let token = ''
  try { token = String(readFileSync(tokenFile, 'utf8')).trim() } catch { /* first run */ }
  if (!/^[0-9a-f]{16,}$/.test(token)) {
    token = crypto.randomBytes(18).toString('hex')
    try { writeFileSync(tokenFile, token, 'utf8') } catch { /* ignore */ }
  }

  const isSessionId = (value) => typeof value === 'string' && /^session-[A-Za-z0-9-]{8,}$/.test(value)

  const readWorkspace = async () => JSON.parse(await fs.readFile(workspaceFile, 'utf8'))

  const writeWorkspace = async (data) => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    try {
      await fs.copyFile(workspaceFile, path.join(stores, `workspace.json.bak-${stamp}`))
    } catch { /* first write */ }
    await fs.writeFile(workspaceFile, JSON.stringify(data, null, 4), 'utf8')
  }

  const findSessionDir = async (id) => {
    let entries = []
    try { entries = await fs.readdir(sessionsRoot, { withFileTypes: true }) } catch { return null }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const candidate = path.join(sessionsRoot, entry.name, id)
      try {
        const stat = await fs.stat(candidate)
        if (stat.isDirectory()) return candidate
      } catch { /* keep looking */ }
    }
    return null
  }

  const dropReferences = (data, id) => {
    const global = data?.global ?? {}
    for (const key of ['archivedSessionIds', 'pinnedSessionIds']) {
      if (Array.isArray(global[key])) global[key] = global[key].filter((value) => value !== id)
    }
    const workspaces = data?.tables?.workspaces ?? {}
    for (const workspace of Object.values(workspaces)) {
      if (Array.isArray(workspace.sessionIds)) {
        workspace.sessionIds = workspace.sessionIds.filter((value) => value !== id)
      }
    }
  }

  const locateWorkspace = (data, id) => {
    const workspaces = data?.tables?.workspaces ?? {}
    for (const [workspaceId, workspace] of Object.entries(workspaces)) {
      if (Array.isArray(workspace.sessionIds) && workspace.sessionIds.includes(id)) return workspaceId
    }
    return null
  }

  const movePath = async (from, to) => {
    await fs.mkdir(path.dirname(to), { recursive: true })
    try {
      await fs.rename(from, to)
      return true
    } catch (error) {
      if (error?.code !== 'EXDEV') throw error
      await fs.cp(from, to, { recursive: true })
      await fs.rm(from, { recursive: true, force: true })
      return true
    }
  }

  const removeProjectionCache = async (id) => {
    const dir = path.join(stores, 'session_projcache')
    let entries = []
    try { entries = await fs.readdir(dir) } catch { return }
    await Promise.all(entries
      .filter((name) => name.includes(id))
      .map((name) => fs.rm(path.join(dir, name), { recursive: true, force: true })))
  }

  const listRecycle = async () => {
    await fs.mkdir(recycleRoot, { recursive: true })
    const entries = await fs.readdir(recycleRoot, { withFileTypes: true })
    const items = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const metaFile = path.join(recycleRoot, entry.name, 'meta.json')
      try {
        items.push(JSON.parse(await fs.readFile(metaFile, 'utf8')))
      } catch { /* skip incomplete entries */ }
    }
    items.sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)))
    return items
  }

  const deleteSession = async (id, title) => {
    if (!isSessionId(id)) throw Object.assign(new Error('invalid session id'), { status: 400 })
    // Only a Session with work in flight must be refused; a merely retained Session is safe to move.
    const agent = ctx.get('agents')?.get?.(id)
    const busy = !!(agent && (agent.running === true || agent.status === 'running' || agent.busy === true))
    if (busy) {
      throw Object.assign(new Error('这个对话正在运行，先停下再删除'), { status: 409 })
    }
    const data = await readWorkspace()
    const workspaceId = locateWorkspace(data, id)
    const sessionDir = await findSessionDir(id)
    const storageFile = path.join(stores, `${id}.json`)
    const hasStorage = await fs.stat(storageFile).then(() => true, () => false)
    if (!workspaceId && !sessionDir && !hasStorage) {
      throw Object.assign(new Error('session not found'), { status: 404 })
    }

    const target = path.join(recycleRoot, id)
    await fs.mkdir(target, { recursive: true })
    if (hasStorage) await movePath(storageFile, path.join(target, 'storage.json'))
    if (sessionDir) await movePath(sessionDir, path.join(target, 'logs'))

    dropReferences(data, id)
    await writeWorkspace(data)
    await removeProjectionCache(id)

    const meta = {
      id,
      title: typeof title === 'string' && title.trim() ? title.trim() : null,
      workspaceId,
      sessionDir: sessionDir ? path.relative(sessionsRoot, sessionDir) : null,
      deletedAt: new Date().toISOString(),
    }
    await fs.writeFile(path.join(target, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8')
    return meta
  }

  const restoreSession = async (id) => {
    if (!isSessionId(id)) throw Object.assign(new Error('invalid session id'), { status: 400 })
    const dir = path.join(recycleRoot, id)
    const meta = JSON.parse(await fs.readFile(path.join(dir, 'meta.json'), 'utf8'))

    const storage = path.join(dir, 'storage.json')
    if (await fs.stat(storage).then(() => true, () => false)) {
      await movePath(storage, path.join(stores, `${id}.json`))
    }
    const logs = path.join(dir, 'logs')
    if (meta.sessionDir && await fs.stat(logs).then(() => true, () => false)) {
      await movePath(logs, path.join(sessionsRoot, meta.sessionDir))
    }

    // Placement is owned by the running Host's workspace registry: never rewrite the file here.
    // The Client re-inserts the id through the official workspaces service after this resolves.
    const data = await readWorkspace()
    const workspaces = data?.tables?.workspaces ?? {}
    const ids = Object.keys(workspaces)
    const workspaceId = (meta.workspaceId && workspaces[meta.workspaceId]) ? meta.workspaceId : (ids[0] ?? null)
    await fs.rm(dir, { recursive: true, force: true })
    return { id, workspaceId }
  }

  const emptyRecycle = async () => {
    await fs.mkdir(recycleRoot, { recursive: true })
    const entries = await fs.readdir(recycleRoot)
    let removed = 0
    for (const name of entries) {
      await fs.rm(path.join(recycleRoot, name), { recursive: true, force: true })
      removed += 1
    }
    return { removed }
  }

  const json = (res, status, value) => {
    res.statusCode = status
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.end(JSON.stringify(value))
  }

  const readBody = async (req) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    if (chunks.length === 0) return {}
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return {} }
  }

  const handler = async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const prefix = url.pathname.startsWith(LEGACY_PREFIX) ? LEGACY_PREFIX : ROUTE_PREFIX
    const action = url.pathname.slice(prefix.length).replace(/^\//, '')
    try {
      if (action === 'list' && req.method === 'GET') {
        json(res, 200, { items: await listRecycle() })
        return
      }
      const site = String(req.headers['sec-fetch-site'] || '')
      const origin = String(req.headers.origin || '')
      const host = String(req.headers.host || '')
      const sameOrigin = site === 'same-origin' || (origin && host && origin === `http://${host}`)
      if (req.headers['x-sidebar-plus'] !== token && !sameOrigin) {
        json(res, 403, { error: 'forbidden' })
        return
      }
      const body = await readBody(req)
      if (action === 'delete' && req.method === 'POST') {
        json(res, 200, { item: await deleteSession(String(body.sessionId ?? ''), body.title) })
        return
      }
      if (action === 'restore' && req.method === 'POST') {
        json(res, 200, await restoreSession(String(body.sessionId ?? '')))
        return
      }
      if (action === 'purge' && req.method === 'POST') {
        const id = String(body.sessionId ?? '')
        if (!/^session-[A-Za-z0-9_-]+$/.test(id)) throw Object.assign(new Error('bad session id'), { status: 400 })
        const dir = path.join(recycleRoot, id)
        const stat = await fs.stat(dir).catch(() => null)
        if (!stat) throw Object.assign(new Error('没有这条回收记录'), { status: 404 })
        await fs.rm(dir, { recursive: true, force: true })
        json(res, 200, { id })
        return
      }      if (action === 'empty' && req.method === 'POST') {
        json(res, 200, await emptyRecycle())
        return
      }
      json(res, 404, { error: 'unknown action' })
    } catch (error) {
      json(res, error?.status ?? 500, { error: String(error?.message ?? error) })
    }
  }

  ctx.effect(() => {
    let offIndex = null
    let offRoute = null
    let offLegacy = null
    try {
      offIndex = ctx.webServer.tapIndex((html) =>
        html.replace('</head>', `<script>window.__DSH_SIDEBAR_PLUS__=${JSON.stringify({ token })}</script></head>`))
    } catch { /* index tap unavailable */ }
    try {
      offRoute = ctx.webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler })
    } catch { /* route unavailable */ }
    try {
      offLegacy = ctx.webServer.register({ kind: 'prefix', path: LEGACY_PREFIX, handler })
    } catch { /* legacy route unavailable */ }
    return () => { offLegacy?.(); offRoute?.(); offIndex?.() }
  })
}
