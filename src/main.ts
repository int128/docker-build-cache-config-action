import * as core from '@actions/core'
import { run } from './run'

const main = (): void => {
  const outputs = run({
    image: core.getInput('image', { required: true }),
    flavor: core.getMultilineInput('flavor'),
    tagPrefix: core.getInput('tag-prefix'),
    tagSuffix: core.getInput('tag-suffix'),
  })
  core.setOutput('cache-from', outputs.cacheFrom)
  core.setOutput('cache-to', outputs.cacheTo)
}

main()
