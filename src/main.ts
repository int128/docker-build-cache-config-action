import * as core from '@actions/core'
import { run } from './run'

const main = async (): Promise<void> => {
  const outputs = await run({
    image: core.getInput('image', { required: true }),
    flavor: core.getMultilineInput('flavor'),
    tagPrefix: core.getInput('tag-prefix'),
    tagSuffix: core.getInput('tag-suffix'),
    extraCacheFrom: core.getInput('extra-cache-from'),
    extraCacheTo: core.getInput('extra-cache-to'),
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
