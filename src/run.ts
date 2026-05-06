import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as core from '@actions/core'
import type { Octokit } from '@octokit/action'
import { generateBake } from './bake.js'
import { type CacheType, generateDockerFlags } from './docker.js'
import type { Context } from './github.js'
import { inferImageTags } from './infer.js'

type Inputs = {
  image: string
  cacheType: CacheType
  flavor: string[]
  pullRequestCache: boolean
  cacheKey: string[]
  cacheKeyFallback: string[]
  extraCacheFrom: string
  extraCacheTo: string
  bakeTarget: string
}

type Outputs = {
  cacheFrom: string
  cacheTo: string
  bakeFile: string
}

export const run = async (inputs: Inputs, octokit: Octokit, context: Context): Promise<Outputs> => {
  const tags = await inferImageTags(
    {
      image: inputs.image,
      flavor: inputs.flavor,
      pullRequestCache: inputs.pullRequestCache,
      cacheKey: inputs.cacheKey,
      cacheKeyFallback: inputs.cacheKeyFallback,
    },
    octokit,
    context,
  )
  core.info(`Inferred cache-from: ${tags.from.join(', ')}`)
  core.info(`Inferred cache-to: ${tags.to.join(', ')}`)
  const dockerFlags = generateDockerFlags({
    cacheType: inputs.cacheType,
    cacheFromImageTag: tags.from,
    cacheToImageTag: tags.to,
    extraCacheFrom: inputs.extraCacheFrom,
    extraCacheTo: inputs.extraCacheTo,
  })

  const bake = generateBake(inputs.bakeTarget, dockerFlags)
  core.startGroup('Bake file definition')
  core.info(JSON.stringify(bake, undefined, 2))
  core.endGroup()

  const tempDir = await fs.mkdtemp(path.join(context.runnerTemp, 'docker-build-cache-config-action-'))
  const bakeFile = `${tempDir}/docker-build-cache-config-action-bake.json`
  await fs.writeFile(bakeFile, JSON.stringify(bake))
  return {
    cacheFrom: dockerFlags.cacheFrom.join('\n'),
    cacheTo: dockerFlags.cacheTo.join('\n'),
    bakeFile,
  }
}
