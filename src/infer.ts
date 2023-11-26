import { IssueCommentEvent, PullRequestEvent, PushEvent } from '@octokit/webhooks-types'
import { Context, Octokit } from './github'

const trimPrefix = (s: string, prefix: string) => (s.startsWith(prefix) ? s.substring(prefix.length) : s)

type Inputs = {
  image: string
  flavor: string[]
  pullRequestCache: boolean
  cacheKey: string
  cacheKeyFallback: string[]
}

type Cache = {
  from: string[]
  to: string[]
}

export const inferImageTags = async (octokit: Octokit, context: Context, inputs: Inputs): Promise<Cache> => {
  const flavor = parseFlavor(inputs.flavor)
  const keys = await inferCacheKeys(octokit, context, inputs)
  return {
    from: keys.from.map((from) => `${inputs.image}:${escape(`${flavor.prefix}${from}${flavor.suffix}`)}`),
    to: keys.to.map((to) => `${inputs.image}:${escape(`${flavor.prefix}${to}${flavor.suffix}`)}`),
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

const inferCacheKeys = async (octokit: Octokit, context: Context, inputs: Inputs): Promise<Cache> => {
  if (context.eventName === 'push' && context.ref.startsWith('refs/heads/')) {
    return handlePushBranchEvent(context, inputs)
  }
  if (context.eventName === 'push' && context.ref.startsWith('refs/tags/')) {
    return handlePushTagEvent(context, inputs)
  }
  if (context.eventName === 'pull_request') {
    return handlePullRequestEvent(context, inputs)
  }
  if (isPullRequestCommentEvent(context)) {
    return handlePullRequestCommentEvent(octokit, context, inputs)
  }
  return fallbackToImportOnly(context, inputs)
}

const handlePushBranchEvent = (context: Context, inputs: Inputs): Cache => {
  if (inputs.cacheKey) {
    return {
      from: [inputs.cacheKey],
      to: [inputs.cacheKey],
    }
  }
  const currentBranch = trimPrefix(context.ref, 'refs/heads/')
  return {
    from: [currentBranch],
    to: [currentBranch],
  }
}

const handlePushTagEvent = (context: Context, inputs: Inputs): Cache => {
  if (inputs.cacheKeyFallback.length > 0) {
    return {
      from: inputs.cacheKeyFallback,
      to: [],
    }
  }

  const payload = context.payload as PushEvent
  const defaultBranch = payload.repository.default_branch
  return {
    from: [defaultBranch],
    to: [],
  }
}

const handlePullRequestEvent = (context: Context, inputs: Inputs): Cache => {
  const pullRequestCacheKey = `pr-${context.issue.number}`
  if (inputs.cacheKeyFallback.length > 0) {
    if (inputs.pullRequestCache) {
      return {
        from: [pullRequestCacheKey, ...inputs.cacheKeyFallback],
        to: [pullRequestCacheKey],
      }
    }
    return {
      from: inputs.cacheKeyFallback,
      to: [],
    }
  }

  const payload = context.payload as PullRequestEvent
  const baseBranch = payload.pull_request.base.ref
  if (inputs.pullRequestCache) {
    return {
      from: [pullRequestCacheKey, baseBranch],
      to: [pullRequestCacheKey],
    }
  }
  return {
    from: [baseBranch],
    to: [],
  }
}

const isPullRequestCommentEvent = (context: Context): boolean => {
  if (context.eventName === 'issue_comment') {
    const payload = context.payload as IssueCommentEvent
    return payload.issue?.pull_request?.url !== undefined
  }
  return false
}

const handlePullRequestCommentEvent = async (octokit: Octokit, context: Context, inputs: Inputs): Promise<Cache> => {
  const pullRequestCacheKey = `pr-${context.issue.number}`
  if (inputs.cacheKeyFallback.length > 0) {
    if (inputs.pullRequestCache) {
      return {
        from: [pullRequestCacheKey, ...inputs.cacheKeyFallback],
        to: [pullRequestCacheKey],
      }
    }
    return {
      from: inputs.cacheKeyFallback,
      to: [],
    }
  }

  const { data: pull } = await octokit.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.issue.number,
  })
  const baseBranch = pull.base.ref
  if (inputs.pullRequestCache) {
    return {
      from: [pullRequestCacheKey, baseBranch],
      to: [pullRequestCacheKey],
    }
  }
  return {
    from: [baseBranch],
    to: [],
  }
}

const fallbackToImportOnly = (context: Context, inputs: Inputs): Cache => {
  if (inputs.cacheKeyFallback.length > 0) {
    return {
      from: inputs.cacheKeyFallback,
      to: [],
    }
  }
  const currentBranch = trimPrefix(context.ref, 'refs/heads/')
  return {
    from: [currentBranch],
    to: [],
  }
}
