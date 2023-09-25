import { getOctokit } from '@actions/github'
import { Context } from '@actions/github/lib/context'
import { IssueCommentEvent, PullRequestEvent, PushEvent } from '@octokit/webhooks-types'

type PartialContext = Pick<Context, 'eventName' | 'ref' | 'payload' | 'repo' | 'issue'>

export type Inputs = {
  image: string
  flavor: string[]
  tagPrefix: string
  tagSuffix: string
  token: string
}

export type Cache = {
  from: string
  to: string | null
}

export const infer = async (context: PartialContext, inputs: Inputs): Promise<Cache> => {
  let { prefix, suffix } = parseFlavor(inputs.flavor)
  if (inputs.tagPrefix) {
    prefix = inputs.tagPrefix
  }
  if (inputs.tagSuffix) {
    suffix = inputs.tagSuffix
  }
  const b = await inferBranch(context, inputs)
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

const inferBranch = async (context: PartialContext, inputs: Inputs): Promise<Cache> => {
  if (context.eventName === 'issue_comment') {
    const payload = context.payload as IssueCommentEvent
    if (payload.issue.pull_request?.url) {
      const octokit = getOctokit(inputs.token)
      const pullRequest = await octokit.rest.pulls.get({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: context.issue.number,
      })
      return {
        from: pullRequest.data.base.ref,
        to: null,
      }
    }
  }

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
