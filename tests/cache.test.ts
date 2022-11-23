import * as cache from '../src/cache'

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
    {
      image: 'ghcr.io/int128/sandbox/cache',
      tagPrefix: '',
      tagSuffix: '',
    }
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:main',
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
    {
      image: 'ghcr.io/int128/sandbox/cache',
      tagPrefix: '',
      tagSuffix: '',
    }
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:main',
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
    {
      image: 'ghcr.io/int128/sandbox/cache',
      tagPrefix: 'frontend--',
      tagSuffix: '',
    }
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:frontend--main',
    to: 'ghcr.io/int128/sandbox/cache:frontend--main',
  })
})

test('on push branch with suffix', () => {
  const c = cache.infer(
    {
      eventName: 'push',
      ref: 'refs/heads/main',
      payload: {},
    },
    {
      image: 'ghcr.io/int128/sandbox/cache',
      tagPrefix: '',
      tagSuffix: '-arm64',
    }
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:main-arm64',
    to: 'ghcr.io/int128/sandbox/cache:main-arm64',
  })
})

test('on push branch with prefix and suffix', () => {
  const c = cache.infer(
    {
      eventName: 'push',
      ref: 'refs/heads/main',
      payload: {},
    },
    {
      image: 'ghcr.io/int128/sandbox/cache',
      tagPrefix: 'frontend--',
      tagSuffix: '-arm64',
    }
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:frontend--main-arm64',
    to: 'ghcr.io/int128/sandbox/cache:frontend--main-arm64',
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
    {
      image: 'ghcr.io/int128/sandbox/cache',
      tagPrefix: '',
      tagSuffix: '',
    }
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:main',
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
    {
      image: 'ghcr.io/int128/sandbox/cache',
      tagPrefix: '',
      tagSuffix: '',
    }
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:main',
    to: null,
  })
})
