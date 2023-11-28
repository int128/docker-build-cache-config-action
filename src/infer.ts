import { IssueCommentEvent, PullRequestEvent, PushEvent } from '@octokit/webhooks-types'
import { Context, Octokit } from './github'

type Inputs = {
  image: string
  flavor: string[]
  pullRequestCache: boolean
}

type Cache = {
  from: string[]
  to: string[]
}

export const inferImageTags = async (octokit: Octokit, context: Context, inputs: Inputs): Promise<Cache> => {
  const flavor = parseFlavor(inputs.flavor)
  const keys = await inferCacheKeys(octokit, context, inputs)
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

const inferCacheKeys = async (octokit: Octokit, context: Context, inputs: Inputs): Promise<Cache> => {
  switch (context.eventName) {
    case 'issue_comment':
      return inferIssueCommentBranch(octokit, context, inputs)

    case 'pull_request':
      return inferPullRequestBranch(context, inputs)

    case 'push':
      return inferPushBranch(context)
  }

  return {
    from: [trimPrefix(context.ref, 'refs/heads/')],
    to: [],
  }
}

const inferIssueCommentBranch = async (octokit: Octokit, context: Context, inputs: Inputs): Promise<Cache> => {
  const payload = context.payload as IssueCommentEvent
  if (!payload.issue.pull_request?.url) {
    return {
      from: [payload.repository.default_branch],
      to: [],
    }
  }

  const { data: pull } = await octokit.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.issue.number,
  })
  return inferPullRequestData(pull, inputs)
}

const inferPullRequestBranch = (context: Context, inputs: Inputs): Cache => {
  const payload = context.payload as PullRequestEvent
  return inferPullRequestData(payload.pull_request, inputs)
}

type PullRequest = {
  base: {
    ref: string
    repo: { default_branch: string }
  }
  number: number
}

const inferPullRequestData = (pull: PullRequest, inputs: Inputs): Cache => {
  if (!inputs.pullRequestCache) {
    return {
      from: [pull.base.ref, pull.base.repo.default_branch],
      to: [],
    }
  }

  const pullRequestCache = `pr-${pull.number}`
  return {
    from: [pullRequestCache, pull.base.ref, pull.base.repo.default_branch],
    to: [pullRequestCache],
  }
}

const inferPushBranch = (context: Context): Cache => {
  // branch push
  if (context.ref.startsWith('refs/heads/')) {
    const branchName = trimPrefix(context.ref, 'refs/heads/')
    return {
      from: [branchName],
      to: [branchName],
    }
  }

  // tag push
  const payload = context.payload as PushEvent
  return {
    from: [payload.repository.default_branch],
    to: [],
  }
}

const trimPrefix = (s: string, prefix: string) => (s.startsWith(prefix) ? s.substring(prefix.length) : s)
