import { inferImageTags } from '../src/infer'

const octokitMock = {
  rest: {
    pulls: {
      get: jest.fn(),
    },
  },
}
jest.mock('@actions/github', () => ({ getOctokit: () => octokitMock }))

test.each([
  {
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      token: '',
      pullRequestCache: false,
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:main'],
      to: [],
    },
  },
  {
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      token: '',
      pullRequestCache: true,
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:pr-123', 'ghcr.io/int128/sandbox/cache:main'],
      to: ['ghcr.io/int128/sandbox/cache:pr-123'],
    },
  },
])('on pull request %p', async ({ inputs, expected }) => {
  const c = await inferImageTags(
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
    inputs,
  )
  expect(c).toStrictEqual(expected)
})

test.each([
  {
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      token: '',
      pullRequestCache: false,
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:main'],
      to: [],
    },
  },
  {
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      token: '',
      pullRequestCache: true,
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:pr-123', 'ghcr.io/int128/sandbox/cache:main'],
      to: ['ghcr.io/int128/sandbox/cache:pr-123'],
    },
  },
])('on pull request comment %p', async ({ inputs, expected }) => {
  octokitMock.rest.pulls.get.mockResolvedValueOnce({
    data: {
      base: {
        ref: 'main',
      },
      number: 123,
    },
  })
  const c = await inferImageTags(
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
    inputs,
  )
  expect(octokitMock.rest.pulls.get).toHaveBeenCalledTimes(1)
  expect(octokitMock.rest.pulls.get).toHaveBeenCalledWith({
    owner: 'int128',
    repo: 'sandbox',
    pull_number: 123,
  })
  expect(c).toStrictEqual(expected)
})

test('on push branch', async () => {
  const c = await inferImageTags(
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
      token: '',
      pullRequestCache: false,
    },
  )
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:main'],
    to: ['ghcr.io/int128/sandbox/cache:main'],
  })
})

test.each([
  {
    image: 'ghcr.io/int128/sandbox/cache',
    flavor: ['prefix=frontend--'],
    token: '',
    pullRequestCache: false,
  },
])('on push branch with prefix %p', async (inputs) => {
  const c = await inferImageTags(
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
    from: ['ghcr.io/int128/sandbox/cache:frontend--main'],
    to: ['ghcr.io/int128/sandbox/cache:frontend--main'],
  })
})

test.each([
  {
    image: 'ghcr.io/int128/sandbox/cache',
    flavor: ['suffix=-arm64'],
    token: '',
    pullRequestCache: false,
  },
])('on push branch with suffix %p', async (inputs) => {
  const c = await inferImageTags(
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
    from: ['ghcr.io/int128/sandbox/cache:main-arm64'],
    to: ['ghcr.io/int128/sandbox/cache:main-arm64'],
  })
})

test.each([
  {
    image: 'ghcr.io/int128/sandbox/cache',
    flavor: ['prefix=frontend--,suffix=-arm64'],
    token: '',
    pullRequestCache: false,
  },
  {
    image: 'ghcr.io/int128/sandbox/cache',
    flavor: ['prefix=frontend--', 'suffix=-arm64'],
    token: '',
    pullRequestCache: false,
  },
])('on push branch with prefix and suffix %p', async (inputs) => {
  const c = await inferImageTags(
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
    from: ['ghcr.io/int128/sandbox/cache:frontend--main-arm64'],
    to: ['ghcr.io/int128/sandbox/cache:frontend--main-arm64'],
  })
})

test('on push tag', async () => {
  const c = await inferImageTags(
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
      token: '',
      pullRequestCache: false,
    },
  )
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:main'],
    to: [],
  })
})

test('on schedule', async () => {
  const c = await inferImageTags(
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
      token: '',
      pullRequestCache: false,
    },
  )
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:main'],
    to: [],
  })
})
