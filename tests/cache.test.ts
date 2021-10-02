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
    }
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:main',
    to: 'ghcr.io/int128/sandbox/cache:main',
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
    }
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:main',
    to: null,
  })
})
