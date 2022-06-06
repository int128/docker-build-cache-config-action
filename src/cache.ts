import { Context } from '@actions/github/lib/context'
import { PullRequestEvent, PushEvent } from '@octokit/webhooks-types'

type PartialContext = Pick<Context, 'eventName' | 'ref' | 'payload'>

export type Inputs = {
  image: string
  tagPrefix: string
}

export type Cache = {
  from: string[]
  to: string | null
}

export const infer = (context: PartialContext, inputs: Inputs): Cache => {
  const b = inferBranch(context)
  const from = [
    ...(inputs.tagPrefix ? b.from.map((from) => `${inputs.image}:${escape(`${inputs.tagPrefix}${from}`)}`) : []),
    ...b.from.map((from) => `${inputs.image}:${escape(from)}`),
  ]
  const fromDefault = `${inputs.image}:${escape(
    (context.payload as PullRequestEvent | PushEvent).repository.default_branch
  )}`
  return {
    from: [...from, ...(from.includes(fromDefault) ? [] : [fromDefault])],
    to: b.to !== null ? `${inputs.image}:${escape(`${inputs.tagPrefix}${b.to}`)}` : null,
  }
}

const escape = (s: string) => s.replace(/[/]/, '-')

const inferBranch = (context: PartialContext): Cache => {
  if (context.eventName === 'pull_request') {
    const payload = context.payload as PullRequestEvent
    return {
      from: [payload.pull_request.head.ref, payload.pull_request.base.ref],
      to: null,
    }
  }

  if (context.eventName === 'push') {
    if (context.ref.startsWith('refs/heads/')) {
      // branch push
      const branchName = trimPrefix(context.ref, 'refs/heads/')
      return {
        from: [branchName],
        to: branchName,
      }
    }

    if (context.ref.startsWith('refs/tags/')) {
      // tag push
      return {
        from: [],
        to: null,
      }
    }
  }

  return {
    from: [trimPrefix(context.ref, 'refs/heads/')],
    to: null,
  }
}

const trimPrefix = (s: string, prefix: string) => (s.startsWith(prefix) ? s.substring(prefix.length) : s)
