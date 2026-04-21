import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

const fire = async (req: { payload: { logger: { warn: (msg: string) => void; info: (msg: string) => void } } }) => {
  const url = process.env.WEB_DEPLOY_HOOK_URL
  if (!url) return

  try {
    const res = await fetch(url, { method: 'POST' })
    if (!res.ok) {
      req.payload.logger.warn(
        `Web deploy hook failed: ${res.status} ${res.statusText}`,
      )
    } else {
      req.payload.logger.info('Web deploy hook triggered')
    }
  } catch (err) {
    req.payload.logger.warn(`Web deploy hook error: ${(err as Error).message}`)
  }
}

export const triggerWebDeployAfterChange: CollectionAfterChangeHook = async ({ req }) => {
  await fire(req)
}

export const triggerWebDeployAfterDelete: CollectionAfterDeleteHook = async ({ req }) => {
  await fire(req)
}

export const triggerWebDeployAfterGlobalChange: GlobalAfterChangeHook = async ({ req }) => {
  await fire(req)
}
