import * as core from '@actions/core'
import * as github from '@actions/github'
import { run } from './run.js'
import { CacheType } from './docker.js'

const main = async (): Promise<void> => {
  if (core.getInput('tag-prefix')) {
    throw new Error('tag-prefix is obsoleted, use flavor instead')
  }
  if (core.getInput('tag-suffix')) {
    throw new Error('tag-suffix is obsoleted, use flavor instead')
  }

  const outputs = await run({
    image: core.getInput('image', { required: true }),
    cacheType: core.getInput('cache-type', { required: true }) as CacheType,
    flavor: core.getMultilineInput('flavor'),
    pullRequestCache: core.getBooleanInput('pull-request-cache'),
    cacheKey: core.getMultilineInput('cache-key'),
    cacheKeyFallback: core.getMultilineInput('cache-key-fallback'),
    extraCacheFrom: core.getInput('extra-cache-from'),
    extraCacheTo: core.getInput('extra-cache-to'),
    bakeTarget: core.getInput('bake-target', { required: true }),
    context: github.context,
    octokit: github.getOctokit(core.getInput('token', { required: true })),
  })
  core.info(`Setting outputs: ${JSON.stringify(outputs, undefined, 2)}`)
  core.setOutput('cache-from', outputs.cacheFrom)
  core.setOutput('cache-to', outputs.cacheTo)
  core.setOutput('bake-file', outputs.bakeFile)
}

main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
