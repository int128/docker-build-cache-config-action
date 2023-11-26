import * as core from '@actions/core'
import { inferImageTags } from './infer'
import { generateDockerFlags } from './docker'
import { Context, getOctokit } from './github'

type Inputs = {
  image: string
  flavor: string[]
  pullRequestCache: boolean
  extraCacheFrom: string
  extraCacheTo: string
  context: Context
  token: string

  // To inject a mock for testing
  octokitOptions?: Parameters<typeof getOctokit>[1]
}

type Outputs = {
  cacheFrom: string
  cacheTo: string
}

export const run = async (inputs: Inputs): Promise<Outputs> => {
  const octokit = getOctokit(inputs.token, inputs.octokitOptions)

  const tags = await inferImageTags(octokit, inputs.context, inputs)
  core.info(`Inferred cache-from: ${tags.from.join(', ')}`)
  core.info(`Inferred cache-to: ${tags.to.join(', ')}`)
  return generateDockerFlags({
    cacheFromImageTag: tags.from,
    cacheToImageTag: tags.to,
    extraCacheFrom: inputs.extraCacheFrom,
    extraCacheTo: inputs.extraCacheTo,
  })
}
