import { Context } from '@actions/github/lib/context'
import { PullRequestEvent, PushEvent } from '@octokit/webhooks-types'

type PartialContext = Pick<Context, 'eventName' | 'ref' | 'payload'>

export type Inputs = {
  image: string
  tagPrefix: string[]
}

export type Cache = {
  from: string[]
  to: string[]
}

export const infer = (context: PartialContext, inputs: Inputs): Cache => {
  const b = inferBranch(context)
  const from = []
  const to = []

  for (const prefix of inputs.tagPrefix) {
    for (const bFrom of b.from) {
      from.push(`${inputs.image}:${escape(`${prefix}${bFrom}`)}`)
    }
  }

  for (const bFrom of b.from) {
    from.push(`${inputs.image}:${escape(`${bFrom}`)}`)
  }

  for (const prefix of inputs.tagPrefix) {
    const fromDefaultPrefixed = `${inputs.image}:${escape(
      `${prefix}${(context.payload as PullRequestEvent | PushEvent).repository.default_branch}`
    )}`
    from.push(fromDefaultPrefixed)
  }

  const fromDefault = `${inputs.image}:${escape(
    (context.payload as PullRequestEvent | PushEvent).repository.default_branch
  )}`

  if (!from.includes(fromDefault)) {
    from.push(fromDefault)
  }

  for (const bTo of b.to) {
    to.push(`${inputs.image}:${escape(`${inputs.tagPrefix[0] ?? ''}${bTo}`)}`)
  }

  return {
    from: [...new Set(from)],
    to,
  }
}

const escape = (s: string) => s.replaceAll(/[^\w.-]/g, '-')

const inferBranch = (context: PartialContext): Cache => {
  if (context.eventName === 'pull_request') {
    const payload = context.payload as PullRequestEvent
    return {
      from: [payload.pull_request.head.ref, payload.pull_request.base.ref],
      to: [],
    }
  }

  if (context.eventName === 'push') {
    if (context.ref.startsWith('refs/heads/')) {
      // branch push
      const branchName = trimPrefix(context.ref, 'refs/heads/')
      return {
        from: [branchName],
        to: [branchName],
      }
    }

    if (context.ref.startsWith('refs/tags/')) {
      // tag push
      return {
        from: [],
        to: [],
      }
    }
  }

  if (context.eventName === 'release') {
    if (context.ref.startsWith('refs/tags/')) {
      // tag push
      return {
        from: [],
        to: [],
      }
    }
  }

  return {
    from: [trimPrefix(context.ref, 'refs/heads/')],
    to: [],
  }
}

const trimPrefix = (s: string, prefix: string) => (s.startsWith(prefix) ? s.substring(prefix.length) : s)
