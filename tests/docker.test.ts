import { generateDockerFlags } from '../src/docker.js'

test('both from and to', () => {
  const outputs = generateDockerFlags({
    cacheFromImageTag: ['ghcr.io/int128/sandbox/cache:main'],
    cacheToImageTag: ['ghcr.io/int128/sandbox/cache:main'],
    extraCacheFrom: '',
    extraCacheTo: '',
  })
  expect(outputs).toStrictEqual({
    cacheFrom: 'type=registry,ref=ghcr.io/int128/sandbox/cache:main',
    cacheTo: 'type=registry,ref=ghcr.io/int128/sandbox/cache:main,mode=max',
  })
})

test('only from', () => {
  const outputs = generateDockerFlags({
    cacheFromImageTag: ['ghcr.io/int128/sandbox/cache:main'],
    cacheToImageTag: [],
    extraCacheFrom: '',
    extraCacheTo: '',
  })
  expect(outputs).toStrictEqual({
    cacheFrom: 'type=registry,ref=ghcr.io/int128/sandbox/cache:main',
    cacheTo: '',
  })
})

test('both from and to with extra args', () => {
  const outputs = generateDockerFlags({
    cacheFromImageTag: ['ghcr.io/int128/sandbox/cache:main'],
    cacheToImageTag: ['ghcr.io/int128/sandbox/cache:main'],
    extraCacheFrom: 'foo=bar',
    extraCacheTo: 'image-manifest=true',
  })
  expect(outputs).toStrictEqual({
    cacheFrom: 'type=registry,ref=ghcr.io/int128/sandbox/cache:main,foo=bar',
    cacheTo: 'type=registry,ref=ghcr.io/int128/sandbox/cache:main,mode=max,image-manifest=true',
  })
})

test('only from with extra args', () => {
  const outputs = generateDockerFlags({
    cacheFromImageTag: ['ghcr.io/int128/sandbox/cache:main'],
    cacheToImageTag: [],
    extraCacheFrom: 'foo=bar',
    extraCacheTo: 'image-manifest=true',
  })
  expect(outputs).toStrictEqual({
    cacheFrom: 'type=registry,ref=ghcr.io/int128/sandbox/cache:main,foo=bar',
    cacheTo: '',
  })
})

test('both multiple from and to', () => {
  const outputs = generateDockerFlags({
    cacheFromImageTag: ['ghcr.io/int128/sandbox/cache:pr-1', 'ghcr.io/int128/sandbox/cache:main'],
    cacheToImageTag: ['ghcr.io/int128/sandbox/cache:pr-1'],
    extraCacheFrom: '',
    extraCacheTo: '',
  })
  expect(outputs).toStrictEqual({
    cacheFrom:
      'type=registry,ref=ghcr.io/int128/sandbox/cache:pr-1' +
      '\n' +
      'type=registry,ref=ghcr.io/int128/sandbox/cache:main',
    cacheTo: 'type=registry,ref=ghcr.io/int128/sandbox/cache:pr-1,mode=max',
  })
})
