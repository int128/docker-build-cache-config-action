import * as core from '@actions/core'
import * as github from '@actions/github'
import { inferImageTags } from './infer'
import { generateDockerFlags } from './docker'

type Inputs = {
  image: string
  flavor: string[]
  extraCacheFrom: string
  extraCacheTo: string
  pullRequestCache: boolean
  token: string
}

type Outputs = {
  cacheFrom: string
  cacheTo: string
}

export const run = async (inputs: Inputs): Promise<Outputs> => {
  const octokit = github.getOctokit(inputs.token)

  const tags = await inferImageTags(octokit, github.context, inputs)
  core.info(`Inferred cache-from: ${tags.from.join(', ')}`)
  core.info(`Inferred cache-to: ${tags.to.join(', ')}`)
  return generateDockerFlags({
    cacheFromImageTag: tags.from,
    cacheToImageTag: tags.to,
    extraCacheFrom: inputs.extraCacheFrom,
    extraCacheTo: inputs.extraCacheTo,
  })
}
