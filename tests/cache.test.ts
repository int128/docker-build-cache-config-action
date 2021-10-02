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
