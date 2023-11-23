import { getOctokit } from '@actions/github'
import { Context } from '@actions/github/lib/context'
import { IssueCommentEvent, PullRequestEvent, PushEvent } from '@octokit/webhooks-types'

type PartialContext = Pick<Context, 'eventName' | 'ref' | 'payload' | 'repo' | 'issue'>

type Inputs = {
  image: string
  flavor: string[]
  tagPrefix: string
  tagSuffix: string
  token: string
  pullRequestCache: boolean
}

type Cache = {
  from: string[]
  to: string[]
}

export const inferImageTags = async (context: PartialContext, inputs: Inputs): Promise<Cache> => {
  let { prefix, suffix } = parseFlavor(inputs.flavor)
  if (inputs.tagPrefix) {
    prefix = inputs.tagPrefix
  }
  if (inputs.tagSuffix) {
    suffix = inputs.tagSuffix
  }

  const b = await inferBranch(context, inputs)

  return {
    from: b.from.map((from) => `${inputs.image}:${escape(`${prefix}${from}${suffix}`)}`),
    to: b.to.map((to) => `${inputs.image}:${escape(`${prefix}${to}${suffix}`)}`),
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

const inferBranch = async (context: PartialContext, inputs: Inputs): Promise<Cache> => {
  switch (context.eventName) {
    case 'issue_comment':
      return inferIssueCommentBranch(context, inputs)

    case 'pull_request':
      return inferPullRequestBranch(context, inputs)

    case 'push':
      return inferPushBranch(context)

    default:
      return inferDefaultBranch(context)
  }
}

const inferIssueCommentBranch = async (context: PartialContext, inputs: Inputs): Promise<Cache> => {
  const issueCommentpayload = context.payload as IssueCommentEvent
  if (!issueCommentpayload.issue.pull_request?.url) {
    return inferDefaultBranch(context)
  }

  const octokit = getOctokit(inputs.token)
  const pullRequest = await octokit.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.issue.number,
  })

  return inferPullRequestData(
    {
      ref: pullRequest.data.base.ref,
      number: pullRequest.data.number,
    },
    inputs,
  )
}

const inferPullRequestBranch = (context: PartialContext, inputs: Inputs): Cache => {
  const payload = context.payload as PullRequestEvent
  return inferPullRequestData(
    {
      ref: payload.pull_request.base.ref,
      number: payload.pull_request.number,
    },
    inputs,
  )
}

type PullRequestData = {
  ref: PullRequestEvent['pull_request']['base']['ref']
  number: PullRequestEvent['pull_request']['number']
}

const inferPullRequestData = ({ ref, number }: PullRequestData, inputs: Inputs): Cache => {
  if (!inputs.pullRequestCache) {
    return {
      from: [ref],
      to: [],
    }
  }

  const pullRequestCache = `pr-${number}`

  return {
    from: [pullRequestCache, ref],
    to: [pullRequestCache],
  }
}

const inferPushBranch = (context: PartialContext): Cache => {
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

const inferDefaultBranch = (context: PartialContext): Cache => {
  return {
    from: [trimPrefix(context.ref, 'refs/heads/')],
    to: [],
  }
}

const trimPrefix = (s: string, prefix: string) => (s.startsWith(prefix) ? s.substring(prefix.length) : s)
