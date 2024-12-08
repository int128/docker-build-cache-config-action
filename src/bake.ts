import { DockerFlags } from './docker.js'

type Bake = {
  target: {
    [target: string]: {
      // https://docs.docker.com/build/bake/reference/#target
      'cache-from': string[]
      'cache-to': string[]
    }
  }
}

export const generateBake = (target: string, flags: DockerFlags): Bake => ({
  target: {
    [target]: {
      'cache-from': flags.cacheFrom,
      'cache-to': flags.cacheTo,
    },
  },
})
