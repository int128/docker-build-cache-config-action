import * as core from '@actions/core'
import { run } from './run'

const main = async (): Promise<void> => {
  if (core.getInput('tag-prefix')) {
    throw new Error('tag-prefix is obsoleted, use flavor instead')
  }
  if (core.getInput('tag-suffix')) {
    throw new Error('tag-suffix is obsoleted, use flavor instead')
  }

  const outputs = await run({
    image: core.getInput('image', { required: true }),
    flavor: core.getMultilineInput('flavor'),
    extraCacheFrom: core.getInput('extra-cache-from'),
    extraCacheTo: core.getInput('extra-cache-to'),
    pullRequestCache: core.getBooleanInput('pull-request-cache'),
    token: core.getInput('token', { required: true }),
  })
  core.info(`Setting outputs: ${JSON.stringify(outputs, undefined, 2)}`)
  core.setOutput('cache-from', outputs.cacheFrom)
  core.setOutput('cache-to', outputs.cacheTo)
}

main().catch((e: Error) => {
  core.setFailed(e)
  console.error(e)
})
