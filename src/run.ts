import * as core from '@actions/core'
import { Context, Octokit } from './github.js'
import { inferImageTags } from './infer.js'
import { CacheType, generateDockerFlags } from './docker.js'

type Inputs = {
  image: string
  cacheType: CacheType
  flavor: string[]
  pullRequestCache: boolean
  cacheKey: string[]
  cacheKeyFallback: string[]
  extraCacheFrom: string
  extraCacheTo: string
  context: Context
  octokit: Octokit
}

type Outputs = {
  cacheFrom: string
  cacheTo: string
}

export const run = async (inputs: Inputs): Promise<Outputs> => {
  const tags = await inferImageTags(inputs.octokit, inputs.context, {
    image: inputs.image,
    flavor: inputs.flavor,
    pullRequestCache: inputs.pullRequestCache,
    cacheKey: inputs.cacheKey,
    cacheKeyFallback: inputs.cacheKeyFallback,
  })
  core.info(`Inferred cache-from: ${tags.from.join(', ')}`)
  core.info(`Inferred cache-to: ${tags.to.join(', ')}`)
  return generateDockerFlags({
    cacheType: inputs.cacheType,
    cacheFromImageTag: tags.from,
    cacheToImageTag: tags.to,
    extraCacheFrom: inputs.extraCacheFrom,
    extraCacheTo: inputs.extraCacheTo,
  })
}
