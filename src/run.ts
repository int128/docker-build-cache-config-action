import * as core from '@actions/core'
import * as github from '@actions/github'
import * as cache from './cache'

export type Inputs = cache.Inputs

type Outputs = {
  cacheFrom: string
  cacheTo: string
}

export const run = (inputs: Inputs): Outputs => {
  const c = cache.infer(github.context, inputs)
  core.info(`Inferred cache: from=${c.from.join(', ')}, to=${c.to ?? 'null'}`)

  return {
    cacheFrom: '|' + c.from.map((from) => `\n  type=registry,ref=${from}`).join(),
    cacheTo: c.to !== null ? `type=registry,ref=${c.to},mode=max` : '',
  }
}
