import * as core from '@actions/core'
import * as github from '@actions/github'
import * as cache from './cache'

export type Inputs = cache.Inputs

type Outputs = {
  cacheFrom: string
  cacheTo: string
}

export const run = async (inputs: Inputs): Promise<Outputs> => {
  const c = await cache.infer(github.context, inputs)
  core.info(`Inferred cache: from=${c.from}, to=${c.to ?? 'null'}`)

  return {
    cacheFrom: `type=registry,ref=${c.from}`,
    cacheTo: c.to !== null ? `type=registry,ref=${c.to},mode=max` : '',
  }
}
