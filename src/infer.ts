import { IssueCommentEvent, PullRequestEvent } from '@octokit/webhooks-types'
import { Context, Octokit } from './github'

type Inputs = {
  image: string
  flavor: string[]
  pullRequestCache: boolean
  cacheKey: string[]
  cacheKeyFallback: string[]
}

type Cache = {
  from: string[]
  to: string[]
}

export const inferImageTags = async (octokit: Octokit, context: Context, inputs: Inputs): Promise<Cache> => {
  const flavor = parseFlavor(inputs.flavor)
  const keys = await getCacheKeys(octokit, context, inputs)
  return {
    from: unique(keys.from.map((from) => `${inputs.image}:${escape(`${flavor.prefix}${from}${flavor.suffix}`)}`)),
    to: unique(keys.to.map((to) => `${inputs.image}:${escape(`${flavor.prefix}${to}${flavor.suffix}`)}`)),
  }
}

const escape = (s: string) => s.replace(/[/]/, '-')

const unique = <T>(a: T[]) => [...new Set(a)]

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

const getCacheKeys = async (octokit: Octokit, context: Context, inputs: Inputs): Promise<Cache> => {
  const cacheKeysToRefresh = inferCacheKeysToRefresh(context, inputs)
  if (cacheKeysToRefresh.length > 0) {
    return {
      from: cacheKeysToRefresh,
      to: cacheKeysToRefresh,
    }
  }

  const cacheKeysToFallback = await inferCacheKeysToFallback(octokit, context, inputs)
  return {
    from: cacheKeysToFallback,
    to: [],
  }
}

const inferCacheKeysToRefresh = (context: Context, inputs: Inputs): string[] => {
  if (context.eventName === 'push' && context.ref.startsWith('refs/heads/')) {
    if (inputs.cacheKey.length > 0) {
      return inputs.cacheKey
    }
    const currentBranch = trimPrefix(context.ref, 'refs/heads/')
    return [currentBranch]
  }

  if (inputs.pullRequestCache && context.eventName === 'pull_request') {
    if (inputs.cacheKey.length > 0) {
      return inputs.cacheKey
    }
    return [`pr-${context.issue.number}`]
  }

  if (inputs.pullRequestCache && context.eventName === 'issue_comment') {
    const payload = context.payload as IssueCommentEvent
    if (payload.issue.pull_request?.url) {
      if (inputs.cacheKey.length > 0) {
        return inputs.cacheKey
      }
      return [`pr-${context.issue.number}`]
    }
  }

  return [] // nothing to refresh
}

const inferCacheKeysToFallback = async (octokit: Octokit, context: Context, inputs: Inputs): Promise<string[]> => {
  if (inputs.cacheKeyFallback.length > 0) {
    return inputs.cacheKeyFallback
  }

  if (context.eventName === 'pull_request') {
    const payload = context.payload as PullRequestEvent
    const baseBranch = payload.pull_request.base.ref
    const defaultBranchOfBaseRepository = payload.pull_request.base.repo.default_branch
    return [baseBranch, defaultBranchOfBaseRepository]
  }

  if (context.eventName === 'issue_comment') {
    const payload = context.payload as IssueCommentEvent
    if (payload.issue.pull_request?.url) {
      const { data: pull } = await octokit.rest.pulls.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: context.issue.number,
      })
      const baseBranch = pull.base.ref
      const defaultBranch = payload.repository.default_branch
      return [baseBranch, defaultBranch]
    }
  }

  if (typeof context.payload.repository?.default_branch === 'string') {
    return [context.payload.repository.default_branch]
  }

  if (context.ref.startsWith('refs/heads/')) {
    return [trimPrefix(context.ref, 'refs/heads/')]
  }
  return []
}

const trimPrefix = (s: string, prefix: string) => (s.startsWith(prefix) ? s.substring(prefix.length) : s)
