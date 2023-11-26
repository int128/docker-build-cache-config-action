import * as context from '@actions/github/lib/context'
import * as github from '@actions/github'
import { GitHub } from '@actions/github/lib/utils'

export type Octokit = InstanceType<typeof GitHub>

// For testability, use a subset of github.context in this module.
export type Context = Pick<context.Context, 'eventName' | 'ref' | 'payload' | 'repo' | 'issue'>

export const getOctokit = github.getOctokit
