import assert from 'node:assert'
import type { Context } from './github.js'
import { Octokit } from '@octokit/action'

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

export const inferImageTags = async (inputs: Inputs, octokit: Octokit, context: Context): Promise<Cache> => {
  const flavor = parseFlavor(inputs.flavor)
  const keys = await inferCacheKeys(inputs, octokit, context)
  return {
    from: unique(
      keys.from.map((from) => `${inputs.image}:${escapeImageTag(`${flavor.prefix}${from}${flavor.suffix}`)}`),
    ),
    to: unique(keys.to.map((to) => `${inputs.image}:${escapeImageTag(`${flavor.prefix}${to}${flavor.suffix}`)}`)),
  }
}

const escapeImageTag = (s: string) => s.replaceAll(/[/]/g, '-')

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

const inferCacheKeys = async (inputs: Inputs, octokit: Octokit, context: Context): Promise<Cache> => {
  if ('issue' in context.payload) {
    return inferIssueEvent(inputs, octokit, context)
  }
  if ('pull_request' in context.payload) {
    return inferPullRequestEvent(context.payload.pull_request, inputs)
  }
  if ('pusher' in context.payload) {
    return inferPushEvent(context, inputs)
  }

  if (inputs.cacheKeyFallback.length > 0) {
    return {
      from: inputs.cacheKeyFallback,
      to: [],
    }
  }
  return {
    from: [trimPrefix(context.ref, 'refs/heads/')],
    to: [],
  }
}

const inferIssueEvent = async (inputs: Inputs, octokit: Octokit, context: Context): Promise<Cache> => {
  assert('issue' in context.payload)

  if (!context.payload.issue.pull_request) {
    if (inputs.cacheKeyFallback.length > 0) {
      return {
        from: inputs.cacheKeyFallback,
        to: [],
      }
    }
    return {
      from: [context.payload.repository.default_branch],
      to: [],
    }
  }

  const { data: pull } = await octokit.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.payload.issue.number,
  })
  return inferPullRequestEvent(pull, inputs)
}

type PullRequest = {
  base: {
    ref: string
    repo: { default_branch: string }
  }
  number: number
}

const inferPullRequestEvent = (pull: PullRequest, inputs: Inputs): Cache => {
  if (!inputs.pullRequestCache) {
    if (inputs.cacheKeyFallback.length > 0) {
      return {
        from: inputs.cacheKeyFallback,
        to: [],
      }
    }
    return {
      from: [pull.base.ref, pull.base.repo.default_branch],
      to: [],
    }
  }

  if (inputs.cacheKey.length > 0) {
    // When cache-key is given, an image tag does not correspond to a branch name.
    // Do not fallback to the base branch.
    return {
      from: [...inputs.cacheKey, ...inputs.cacheKeyFallback],
      to: inputs.cacheKey,
    }
  }

  const pullRequestKey = `pr-${pull.number}`
  if (inputs.cacheKeyFallback.length > 0) {
    return {
      from: [pullRequestKey, pull.base.ref, ...inputs.cacheKeyFallback],
      to: [pullRequestKey],
    }
  }
  return {
    from: [pullRequestKey, pull.base.ref, pull.base.repo.default_branch],
    to: [pullRequestKey],
  }
}

const inferPushEvent = (context: Context, inputs: Inputs): Cache => {
  assert('pusher' in context.payload)

  // branch push
  if (context.ref.startsWith('refs/heads/')) {
    if (inputs.cacheKey.length > 0) {
      return {
        from: inputs.cacheKey,
        to: inputs.cacheKey,
      }
    }
    const branchName = trimPrefix(context.ref, 'refs/heads/')
    return {
      from: [branchName],
      to: [branchName],
    }
  }

  // tag push
  if (inputs.cacheKeyFallback.length > 0) {
    return {
      from: inputs.cacheKeyFallback,
      to: [],
    }
  }
  return {
    from: [context.payload.repository.default_branch],
    to: [],
  }
}

const trimPrefix = (s: string, prefix: string) => (s.startsWith(prefix) ? s.substring(prefix.length) : s)
