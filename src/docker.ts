type Inputs = {
  cacheFromImageTag: string
  cacheToImageTag: string | null
  extraCacheFrom: string
  extraCacheTo: string
}

type Outputs = {
  cacheFrom: string
  cacheTo: string
}

export const generateDockerFlags = (inputs: Inputs): Outputs => {
  const cacheFrom = ['type=registry', `ref=${inputs.cacheFromImageTag}`]
  if (inputs.extraCacheFrom) {
    cacheFrom.push(inputs.extraCacheFrom)
  }

  const cacheTo = []
  if (inputs.cacheToImageTag) {
    cacheTo.push('type=registry', `ref=${inputs.cacheToImageTag}`, 'mode=max')
    if (inputs.extraCacheTo) {
      cacheTo.push(inputs.extraCacheTo)
    }
  }

  return {
    cacheFrom: cacheFrom.join(','),
    cacheTo: cacheTo.join(','),
  }
}
