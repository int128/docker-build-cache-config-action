import * as os from 'node:os'
import type * as github from '@actions/github'

export type Octokit = ReturnType<typeof github.getOctokit>

// For testability, use a subset of github.context in this module.
export type Context = Pick<typeof github.context, 'eventName' | 'ref' | 'payload' | 'repo' | 'issue'>

export const getRunnerTemp = (): string => process.env.RUNNER_TEMP || os.tmpdir()
