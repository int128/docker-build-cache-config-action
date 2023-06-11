import { Context } from '@actions/github/lib/context'
import { PullRequestEvent, PushEvent } from '@octokit/webhooks-types'

type PartialContext = Pick<Context, 'eventName' | 'ref' | 'payload'>

export type Inputs = {
  image: string
  flavor: string[]
  tagPrefix: string
  tagSuffix: string
}

export type Cache = {
  from: string
  to: string | null
}

export const infer = (context: PartialContext, inputs: Inputs): Cache => {
  let { prefix, suffix } = parseFlavor(inputs.flavor)
  if (inputs.tagPrefix) {
    prefix = inputs.tagPrefix
  }
  if (inputs.tagSuffix) {
    suffix = inputs.tagSuffix
  }
  const b = inferBranch(context)
  return {
    from: `${inputs.image}:${escape(`${prefix}${b.from}${suffix}`)}`,
    to: b.to !== null ? `${inputs.image}:${escape(`${prefix}${b.to}${suffix}`)}` : null,
  }
}

const escape = (s: string) => s.replace(/[/]/, '-')

const parseFlavor = (flavor: string[]) => {
  let prefix = ''
  let suffix = ''
  for (const kv of flavor.flatMap((s) => s.split(/,/))) {
    const [k, v] = kv.trim().split(/=/, 2)
    if (k === 'prefix') {
      prefix = v
    }
    if (k === 'suffix') {
      suffix = v
    }
  }
  return { prefix, suffix }
}

const inferBranch = (context: PartialContext): Cache => {
  if (context.eventName === 'pull_request') {
    const payload = context.payload as PullRequestEvent
    return {
      from: payload.pull_request.base.ref,
      to: null,
    }
  }

  if (context.eventName === 'push') {
    // branch push
    if (context.ref.startsWith('refs/heads/')) {
      const branchName = trimPrefix(context.ref, 'refs/heads/')
      return {
        from: branchName,
        to: branchName,
      }
    }

    // tag push
    const payload = context.payload as PushEvent
    return {
      from: payload.repository.default_branch,
      to: null,
    }
  }

  return {
    from: trimPrefix(context.ref, 'refs/heads/'),
    to: null,
  }
}

const trimPrefix = (s: string, prefix: string) => (s.startsWith(prefix) ? s.substring(prefix.length) : s)
