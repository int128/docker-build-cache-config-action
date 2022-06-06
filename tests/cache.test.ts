import * as cache from '../src/cache'

const inputs = {
  image: 'ghcr.io/int128/sandbox/cache',
  tagPrefix: '',
}

const inputsPrefixed = {
  image: 'ghcr.io/int128/sandbox/cache',
  tagPrefix: 'prefix-',
}

test('on pull request', () => {
  const c = cache.infer(
    {
      eventName: 'pull_request',
      ref: 'refs/pulls/123/merge',
      payload: {
        pull_request: {
          number: 123,
          base: {
            ref: 'main',
          },
        },
      },
    },
    inputs
  )
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:main'],
    to: null,
  })
})

test('on pull request with prefix', () => {
  const c = cache.infer(
    {
      eventName: 'pull_request',
      ref: 'refs/pulls/123/merge',
      payload: {
        pull_request: {
          number: 123,
          base: {
            ref: 'main',
          },
        },
      },
    },
    inputsPrefixed
  )
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:prefix-main', 'ghcr.io/int128/sandbox/cache:main'],
    to: null,
  })
})

test('on push branch', () => {
  const c = cache.infer(
    {
      eventName: 'push',
      ref: 'refs/heads/main',
      payload: {},
    },
    inputs
  )
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:main'],
    to: 'ghcr.io/int128/sandbox/cache:main',
  })
})

test('on push branch with prefix', () => {
  const c = cache.infer(
    {
      eventName: 'push',
      ref: 'refs/heads/main',
      payload: {},
    },
    inputsPrefixed
  )
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:prefix-main', 'ghcr.io/int128/sandbox/cache:main'],
    to: 'ghcr.io/int128/sandbox/cache:prefix-main',
  })
})

test('on push tag', () => {
  const c = cache.infer(
    {
      eventName: 'push',
      ref: 'refs/tags/v1.0.0',
      payload: {
        repository: {
          name: 'sandbox',
          owner: { login: 'int128' },
          default_branch: 'main',
        },
      },
    },
    inputs
  )
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:main'],
    to: null,
  })
})

test('on push tag with prefix', () => {
  const c = cache.infer(
    {
      eventName: 'push',
      ref: 'refs/tags/v1.0.0',
      payload: {
        repository: {
          name: 'sandbox',
          owner: { login: 'int128' },
          default_branch: 'main',
        },
      },
    },
    inputsPrefixed
  )
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:prefix-main', 'ghcr.io/int128/sandbox/cache:main'],
    to: null,
  })
})

test('on schedule', () => {
  const c = cache.infer(
    {
      eventName: 'schedule',
      ref: 'refs/heads/main',
      payload: {},
    },
    inputs
  )
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:main'],
    to: null,
  })
})

test('on schedule with prefix', () => {
  const c = cache.infer(
    {
      eventName: 'schedule',
      ref: 'refs/heads/main',
      payload: {},
    },
    inputsPrefixed
  )
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:prefix-main', 'ghcr.io/int128/sandbox/cache:main'],
    to: null,
  })
})
