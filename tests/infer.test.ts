import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { inferImageTags } from '../src/infer.js'
import { getOctokit, server } from './github.js'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test.each([
  {
    description: 'default',
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      pullRequestCache: false,
      cacheKey: [],
      cacheKeyFallback: [],
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:main'],
      to: [],
    },
  },
  {
    description: 'pull-request-cache',
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      pullRequestCache: true,
      cacheKey: [],
      cacheKeyFallback: [],
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:pr-123', 'ghcr.io/int128/sandbox/cache:main'],
      to: ['ghcr.io/int128/sandbox/cache:pr-123'],
    },
  },
  {
    description: 'cache-key-fallback',
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      pullRequestCache: false,
      cacheKey: [],
      cacheKeyFallback: ['development'],
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:development'],
      to: [],
    },
  },
  {
    description: 'pull-request-cache and cache-key-fallback',
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      pullRequestCache: true,
      cacheKey: [],
      cacheKeyFallback: ['development'],
    },
    expected: {
      from: [
        'ghcr.io/int128/sandbox/cache:pr-123',
        'ghcr.io/int128/sandbox/cache:main',
        'ghcr.io/int128/sandbox/cache:development',
      ],
      to: ['ghcr.io/int128/sandbox/cache:pr-123'],
    },
  },
  {
    description: 'pull-request-cache, cache-key and cache-key-fallback',
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      pullRequestCache: true,
      cacheKey: ['pull-request-123'],
      cacheKeyFallback: ['development'],
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:pull-request-123', 'ghcr.io/int128/sandbox/cache:development'],
      to: ['ghcr.io/int128/sandbox/cache:pull-request-123'],
    },
  },
])('on pull_request with $description', async ({ inputs, expected }) => {
  const tags = await inferImageTags(
    getOctokit(),
    {
      eventName: 'pull_request',
      ref: 'refs/pulls/123/merge',
      payload: {
        pull_request: {
          number: 123,
          base: {
            ref: 'main',
            repo: { default_branch: 'main' },
          },
        },
      },
      repo: { owner: 'int128', repo: 'sandbox' },
      issue: { owner: 'int128', repo: 'sandbox', number: 123 },
    },
    inputs,
  )
  expect(tags).toStrictEqual(expected)
})

test.each([
  {
    description: 'default',
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      pullRequestCache: false,
      cacheKey: [],
      cacheKeyFallback: [],
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:yet-another-base', 'ghcr.io/int128/sandbox/cache:main'],
      to: [],
    },
  },
  {
    description: 'pull-request-cache',
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      pullRequestCache: true,
      cacheKey: [],
      cacheKeyFallback: [],
    },
    expected: {
      from: [
        'ghcr.io/int128/sandbox/cache:pr-123',
        'ghcr.io/int128/sandbox/cache:yet-another-base',
        'ghcr.io/int128/sandbox/cache:main',
      ],
      to: ['ghcr.io/int128/sandbox/cache:pr-123'],
    },
  },
])('on pull_request to non-default branch with $description', async ({ inputs, expected }) => {
  const tags = await inferImageTags(
    getOctokit(),
    {
      eventName: 'pull_request',
      ref: 'refs/pulls/123/merge',
      payload: {
        pull_request: {
          number: 123,
          base: {
            ref: 'yet-another-base',
            repo: { default_branch: 'main' },
          },
        },
      },
      repo: { owner: 'int128', repo: 'sandbox' },
      issue: { owner: 'int128', repo: 'sandbox', number: 123 },
    },
    inputs,
  )
  expect(tags).toStrictEqual(expected)
})

test.each([
  {
    description: 'default',
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      pullRequestCache: false,
      cacheKey: [],
      cacheKeyFallback: [],
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:main'],
      to: [],
    },
  },
  {
    description: 'pull-request-cache',
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      pullRequestCache: true,
      cacheKey: [],
      cacheKeyFallback: [],
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:pr-123', 'ghcr.io/int128/sandbox/cache:main'],
      to: ['ghcr.io/int128/sandbox/cache:pr-123'],
    },
  },
])('on issue_comment of pull request with $description', async ({ inputs, expected }) => {
  const tags = await inferImageTags(
    getOctokit(),
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
  expect(tags).toStrictEqual(expected)
})

test.each([
  {
    description: 'default',
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      pullRequestCache: false,
      cacheKey: [],
      cacheKeyFallback: [],
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:main'],
      to: ['ghcr.io/int128/sandbox/cache:main'],
    },
  },
  {
    description: 'cache-key',
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      pullRequestCache: false,
      cacheKey: ['development'],
      cacheKeyFallback: [],
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:development'],
      to: ['ghcr.io/int128/sandbox/cache:development'],
    },
  },
  {
    description: 'prefix',
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: ['prefix=frontend--'],
      pullRequestCache: false,
      cacheKey: [],
      cacheKeyFallback: [],
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:frontend--main'],
      to: ['ghcr.io/int128/sandbox/cache:frontend--main'],
    },
  },
  {
    description: 'suffix',
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: ['suffix=-arm64'],
      pullRequestCache: false,
      cacheKey: [],
      cacheKeyFallback: [],
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:main-arm64'],
      to: ['ghcr.io/int128/sandbox/cache:main-arm64'],
    },
  },
  {
    description: 'prefix and suffix',
    inputs: {
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: ['prefix=frontend--,suffix=-arm64'],
      pullRequestCache: false,
      cacheKey: [],
      cacheKeyFallback: [],
    },
    expected: {
      from: ['ghcr.io/int128/sandbox/cache:frontend--main-arm64'],
      to: ['ghcr.io/int128/sandbox/cache:frontend--main-arm64'],
    },
  },
])('on push branch with $description', async ({ inputs, expected }) => {
  const tags = await inferImageTags(
    getOctokit(),
    {
      eventName: 'push',
      ref: 'refs/heads/main',
      payload: {},
      repo: { owner: 'int128', repo: 'sandbox' },
      issue: { owner: 'int128', repo: 'sandbox', number: 0 },
    },
    inputs,
  )
  expect(tags).toStrictEqual(expected)
})

test('on push tag', async () => {
  const tags = await inferImageTags(
    getOctokit(),
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
      pullRequestCache: false,
      cacheKey: [],
      cacheKeyFallback: [],
    },
  )
  expect(tags).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:main'],
    to: [],
  })
})

test('on schedule', async () => {
  const tags = await inferImageTags(
    getOctokit(),
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
      pullRequestCache: false,
      cacheKey: [],
      cacheKeyFallback: [],
    },
  )
  expect(tags).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:main'],
    to: [],
  })
})
