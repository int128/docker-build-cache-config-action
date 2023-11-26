import * as core from '@actions/core'
import { Context, Octokit } from './github'
import { inferImageTags } from './infer'
import { generateDockerFlags } from './docker'

type Inputs = {
  image: string
  flavor: string[]
  pullRequestCache: boolean
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
  })
  core.info(`Inferred cache-from: ${tags.from.join(', ')}`)
  core.info(`Inferred cache-to: ${tags.to.join(', ')}`)
  return generateDockerFlags({
    cacheFromImageTag: tags.from,
    cacheToImageTag: tags.to,
    extraCacheFrom: inputs.extraCacheFrom,
    extraCacheTo: inputs.extraCacheTo,
  })
}
