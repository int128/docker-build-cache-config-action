import * as core from '@actions/core'
import * as github from '@actions/github'
import { inferImageTags } from './infer'

type Inputs = {
  image: string
  flavor: string[]
  tagPrefix: string
  tagSuffix: string
  token: string
}

type Outputs = {
  cacheFrom: string
  cacheTo: string
}

export const run = async (inputs: Inputs): Promise<Outputs> => {
  const c = await inferImageTags(github.context, inputs)
  core.info(`Inferred from tag: ${c.from}`)
  core.info(`Inferred to tag: ${c.to}`)

  return {
    cacheFrom: `type=registry,ref=${c.from}`,
    cacheTo: c.to !== null ? `type=registry,ref=${c.to},mode=max` : '',
  }
}
