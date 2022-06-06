import * as core from '@actions/core'
import { run } from './run'

const main = (): void => {
  const outputs = run({
    image: core.getInput('image', { required: true }),
    tagPrefix: core.getInput('tag-prefix').split('\n'),
  })
  core.setOutput('cache-from', outputs.cacheFrom)
  core.setOutput('cache-to', outputs.cacheTo)
}

main()
