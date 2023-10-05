import * as core from '@actions/core'
import * as github from '@actions/github'
import { inferImageTags } from './infer'
import { generateDockerFlags } from './docker'

type Inputs = {
  image: string
  flavor: string[]
  tagPrefix: string
  tagSuffix: string
  token: string
  extraCacheFrom: string
  extraCacheTo: string
  pullRequestCache: boolean
}

type Outputs = {
  cacheFrom: string
  cacheTo: string
}

export const run = async (inputs: Inputs): Promise<Outputs> => {
  const c = await inferImageTags(github.context, inputs)
  core.info(`Inferred image tag of from: ${c.from.join(', ')}`)
  core.info(`Inferred image tag of to: ${c.to.join(', ')}`)
  return generateDockerFlags({
    cacheFromImageTag: c.from,
    cacheToImageTag: c.to,
    extraCacheFrom: inputs.extraCacheFrom,
    extraCacheTo: inputs.extraCacheTo,
  })
}
