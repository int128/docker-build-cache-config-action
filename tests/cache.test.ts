import * as cache from '../src/cache'

const octokitMock = {
  rest: {
    pulls: {
      get: jest.fn(),
    },
  },
}
jest.mock('@actions/github', () => ({ getOctokit: () => octokitMock }))

test('on pull request', async () => {
  const c = await cache.infer(
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
      repo: { owner: 'int128', repo: 'sandbox' },
      issue: { owner: 'int128', repo: 'sandbox', number: 0 },
    },
    {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      tagPrefix: '',
      tagSuffix: '',
      token: '',
    },
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:main',
    to: null,
  })
})

test('on pull request comment', async () => {
  octokitMock.rest.pulls.get.mockResolvedValueOnce({
    data: {
      base: {
        ref: 'main',
      },
    },
  })
  const c = await cache.infer(
    {
      eventName: 'issue_comment',
      ref: 'refs/pulls/123/merge',
      payload: {
        issue: {
          number: 123,
          pull_request: {
            url: 'https://api.github.com/int128/sandbox/pulls/123',
          },
        },
      },
      repo: { owner: 'int128', repo: 'sandbox' },
      issue: { owner: 'int128', repo: 'sandbox', number: 123 },
    },
    {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      tagPrefix: '',
      tagSuffix: '',
      token: '',
    },
  )
  expect(octokitMock.rest.pulls.get).toHaveBeenCalledTimes(1)
  expect(octokitMock.rest.pulls.get).toHaveBeenCalledWith({
    owner: 'int128',
    repo: 'sandbox',
    pull_number: 123,
  })
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:main',
    to: null,
  })
})

test('on push branch', async () => {
  const c = await cache.infer(
    {
      eventName: 'push',
      ref: 'refs/heads/main',
      payload: {},
      repo: { owner: 'int128', repo: 'sandbox' },
      issue: { owner: 'int128', repo: 'sandbox', number: 0 },
    },
    {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      tagPrefix: '',
      tagSuffix: '',
      token: '',
    },
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:main',
    to: 'ghcr.io/int128/sandbox/cache:main',
  })
})

test.each([
  {
    image: 'ghcr.io/int128/sandbox/cache',
    flavor: [],
    tagPrefix: 'frontend--',
    tagSuffix: '',
    token: '',
  },
  {
    image: 'ghcr.io/int128/sandbox/cache',
    flavor: ['prefix=frontend--'],
    tagPrefix: '',
    tagSuffix: '',
    token: '',
  },
])('on push branch with prefix %p', async (inputs) => {
  const c = await cache.infer(
    {
      eventName: 'push',
      ref: 'refs/heads/main',
      payload: {},
      repo: { owner: 'int128', repo: 'sandbox' },
      issue: { owner: 'int128', repo: 'sandbox', number: 0 },
    },
    inputs,
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:frontend--main',
    to: 'ghcr.io/int128/sandbox/cache:frontend--main',
  })
})

test.each([
  {
    image: 'ghcr.io/int128/sandbox/cache',
    flavor: [],
    tagPrefix: '',
    tagSuffix: '-arm64',
    token: '',
  },
  {
    image: 'ghcr.io/int128/sandbox/cache',
    flavor: ['suffix=-arm64'],
    tagPrefix: '',
    tagSuffix: '',
    token: '',
  },
])('on push branch with suffix %p', async (inputs) => {
  const c = await cache.infer(
    {
      eventName: 'push',
      ref: 'refs/heads/main',
      payload: {},
      repo: { owner: 'int128', repo: 'sandbox' },
      issue: { owner: 'int128', repo: 'sandbox', number: 0 },
    },
    inputs,
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:main-arm64',
    to: 'ghcr.io/int128/sandbox/cache:main-arm64',
  })
})

test.each([
  {
    image: 'ghcr.io/int128/sandbox/cache',
    flavor: [],
    tagPrefix: 'frontend--',
    tagSuffix: '-arm64',
    token: '',
  },
  {
    image: 'ghcr.io/int128/sandbox/cache',
    flavor: ['prefix=frontend--,suffix=-arm64'],
    tagPrefix: '',
    tagSuffix: '',
    token: '',
  },
  {
    image: 'ghcr.io/int128/sandbox/cache',
    flavor: ['prefix=frontend--', 'suffix=-arm64'],
    tagPrefix: '',
    tagSuffix: '',
    token: '',
  },
])('on push branch with prefix and suffix %p', async (inputs) => {
  const c = await cache.infer(
    {
      eventName: 'push',
      ref: 'refs/heads/main',
      payload: {},
      repo: { owner: 'int128', repo: 'sandbox' },
      issue: { owner: 'int128', repo: 'sandbox', number: 0 },
    },
    inputs,
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:frontend--main-arm64',
    to: 'ghcr.io/int128/sandbox/cache:frontend--main-arm64',
  })
})

test('on push tag', async () => {
  const c = await cache.infer(
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
      repo: { owner: 'int128', repo: 'sandbox' },
      issue: { owner: 'int128', repo: 'sandbox', number: 0 },
    },
    {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      tagPrefix: '',
      tagSuffix: '',
      token: '',
    },
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:main',
    to: null,
  })
})

test('on schedule', async () => {
  const c = await cache.infer(
    {
      eventName: 'schedule',
      ref: 'refs/heads/main',
      payload: {},
      repo: { owner: 'int128', repo: 'sandbox' },
      issue: { owner: 'int128', repo: 'sandbox', number: 0 },
    },
    {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      tagPrefix: '',
      tagSuffix: '',
      token: '',
    },
  )
  expect(c).toStrictEqual({
    from: 'ghcr.io/int128/sandbox/cache:main',
    to: null,
  })
})
