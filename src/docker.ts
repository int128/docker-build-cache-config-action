export type CacheType = 'registry' | 'local' | 'inline' | 'gha' | 's3'

type Inputs = {
  cacheType: CacheType
  cacheFromImageTag: string[]
  cacheToImageTag: string[]
  extraCacheFrom: string
  extraCacheTo: string
}

type Outputs = {
  cacheFrom: string
  cacheTo: string
}

export const generateDockerFlags = (inputs: Inputs): Outputs => {
  const cacheType = `type=${inputs.cacheType}`

  const cacheFrom = inputs.cacheFromImageTag.map((tag) => {
    const cacheFrom = [cacheType, `ref=${tag}`]
    if (inputs.extraCacheFrom) {
      cacheFrom.push(inputs.extraCacheFrom)
    }
    return cacheFrom.join(',')
  })

  const cacheTo = inputs.cacheToImageTag.map((tag) => {
    const cacheTo = []
    cacheTo.push(cacheType, `ref=${tag}`, 'mode=max')
    if (inputs.extraCacheTo) {
      cacheTo.push(inputs.extraCacheTo)
    }
    return cacheTo.join(',')
  })

  return {
    cacheFrom: cacheFrom.join('\n'),
    cacheTo: cacheTo.join('\n'),
  }
}
