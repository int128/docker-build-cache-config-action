import { run } from '../src/run.js'
import { getOctokit, server } from './github.js'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Basic usage', () => {
  test('push event of main branch', async () => {
    const outputs = await run({
      image: 'ghcr.io/int128/sandbox/cache',
      cacheType: 'registry',
      flavor: [],
      pullRequestCache: false,
      extraCacheFrom: '',
      extraCacheTo: '',
      cacheKey: [],
      cacheKeyFallback: [],
      context: {
        eventName: 'push',
        ref: 'refs/heads/main',
        payload: {},
        repo: { owner: 'int128', repo: 'sandbox' },
        issue: { owner: 'int128', repo: 'sandbox', number: 0 },
      },
      bakeTarget: 'docker-build-cache-config-action',
      octokit: getOctokit(),
    })
    expect(outputs.cacheFrom).toBe('type=registry,ref=ghcr.io/int128/sandbox/cache:main')
    expect(outputs.cacheTo).toBe('type=registry,ref=ghcr.io/int128/sandbox/cache:main,mode=max')
  })

  test('pull_request event', async () => {
    const outputs = await run({
      image: 'ghcr.io/int128/sandbox/cache',
      cacheType: 'registry',
      flavor: [],
      pullRequestCache: false,
      extraCacheFrom: '',
      extraCacheTo: '',
      cacheKey: [],
      cacheKeyFallback: [],
      context: {
        eventName: 'pull_request',
        ref: 'refs/pull/1/merge',
        payload: {
          pull_request: {
            base: {
              ref: 'main',
              repo: { default_branch: 'main' },
            },
            number: 1,
          },
        },
        repo: { owner: 'int128', repo: 'sandbox' },
        issue: { owner: 'int128', repo: 'sandbox', number: 1 },
      },
      bakeTarget: 'docker-build-cache-config-action',
      octokit: getOctokit(),
    })
    expect(outputs.cacheFrom).toBe('type=registry,ref=ghcr.io/int128/sandbox/cache:main')
    expect(outputs.cacheTo).toBe('')
  })

  test('issue_comment event', async () => {
    const outputs = await run({
      image: 'ghcr.io/int128/sandbox/cache',
      cacheType: 'registry',
      flavor: [],
      pullRequestCache: false,
      extraCacheFrom: '',
      extraCacheTo: '',
      cacheKey: [],
      cacheKeyFallback: [],
      context: {
        eventName: 'issue_comment',
        ref: 'refs/heads/main',
        payload: {
          issue: {
            number: 1,
            pull_request: {
              url: 'https://api.github.com/repos/int128/sandbox/pulls/1',
            },
          },
        },
        repo: { owner: 'int128', repo: 'sandbox' },
        issue: { owner: 'int128', repo: 'sandbox', number: 1 },
      },
      bakeTarget: 'docker-build-cache-config-action',
      octokit: getOctokit(),
    })
    expect(outputs.cacheFrom).toBe('type=registry,ref=ghcr.io/int128/sandbox/cache:main')
    expect(outputs.cacheTo).toBe('')
  })

  test('schedule event', async () => {
    const outputs = await run({
      image: 'ghcr.io/int128/sandbox/cache',
      cacheType: 'registry',
      flavor: [],
      pullRequestCache: false,
      extraCacheFrom: '',
      extraCacheTo: '',
      cacheKey: [],
      cacheKeyFallback: [],
      context: {
        eventName: 'schedule',
        ref: 'refs/heads/main',
        payload: {},
        repo: { owner: 'int128', repo: 'sandbox' },
        issue: { owner: 'int128', repo: 'sandbox', number: 0 },
      },
      bakeTarget: 'docker-build-cache-config-action',
      octokit: getOctokit(),
    })
    expect(outputs.cacheFrom).toBe('type=registry,ref=ghcr.io/int128/sandbox/cache:main')
    expect(outputs.cacheTo).toBe('')
  })
})

describe('Import and export a pull request cache', () => {
  test('pull_request event', async () => {
    const outputs = await run({
      image: 'ghcr.io/int128/sandbox/cache',
      cacheType: 'registry',
      flavor: [],
      pullRequestCache: true,
      extraCacheFrom: '',
      extraCacheTo: '',
      cacheKey: [],
      cacheKeyFallback: [],
      context: {
        eventName: 'pull_request',
        ref: 'refs/pull/1/merge',
        payload: {
          pull_request: {
            base: {
              ref: 'main',
              repo: { default_branch: 'main' },
            },
            number: 1,
          },
        },
        repo: { owner: 'int128', repo: 'sandbox' },
        issue: { owner: 'int128', repo: 'sandbox', number: 1 },
      },
      bakeTarget: 'docker-build-cache-config-action',
      octokit: getOctokit(),
    })
    expect(outputs.cacheFrom).toBe(`\
type=registry,ref=ghcr.io/int128/sandbox/cache:pr-1
type=registry,ref=ghcr.io/int128/sandbox/cache:main`)
    expect(outputs.cacheTo).toBe('type=registry,ref=ghcr.io/int128/sandbox/cache:pr-1,mode=max')
  })
})

describe('Build multi-architecture images', () => {
  test('push event of main branch', async () => {
    const outputs = await run({
      image: 'ghcr.io/int128/sandbox/cache',
      cacheType: 'registry',
      flavor: ['suffix=-arm64'],
      pullRequestCache: false,
      extraCacheFrom: '',
      extraCacheTo: '',
      cacheKey: [],
      cacheKeyFallback: [],
      context: {
        eventName: 'push',
        ref: 'refs/heads/main',
        payload: {},
        repo: { owner: 'int128', repo: 'sandbox' },
        issue: { owner: 'int128', repo: 'sandbox', number: 0 },
      },
      bakeTarget: 'docker-build-cache-config-action',
      octokit: getOctokit(),
    })
    expect(outputs.cacheFrom).toBe('type=registry,ref=ghcr.io/int128/sandbox/cache:main-arm64')
    expect(outputs.cacheTo).toBe('type=registry,ref=ghcr.io/int128/sandbox/cache:main-arm64,mode=max')
  })
})

describe('For Amazon ECR', () => {
  test('push event of main branch', async () => {
    const outputs = await run({
      image: '123456789012.dkr.ecr.us-west-2.amazonaws.com/int128/sandbox',
      cacheType: 'registry',
      flavor: ['suffix=-cache'],
      pullRequestCache: false,
      extraCacheFrom: '',
      extraCacheTo: 'image-manifest=true',
      cacheKey: [],
      cacheKeyFallback: [],
      context: {
        eventName: 'push',
        ref: 'refs/heads/main',
        payload: {},
        repo: { owner: 'int128', repo: 'sandbox' },
        issue: { owner: 'int128', repo: 'sandbox', number: 0 },
      },
      bakeTarget: 'docker-build-cache-config-action',
      octokit: getOctokit(),
    })
    expect(outputs.cacheFrom).toBe(
      'type=registry,ref=123456789012.dkr.ecr.us-west-2.amazonaws.com/int128/sandbox:main-cache',
    )
    expect(outputs.cacheTo).toBe(
      'type=registry,ref=123456789012.dkr.ecr.us-west-2.amazonaws.com/int128/sandbox:main-cache,mode=max,image-manifest=true',
    )
  })
})

describe('Build multiple image tags from a branch', () => {
  test('push event of main branch', async () => {
    const outputs = await run({
      image: 'ghcr.io/int128/sandbox/cache',
      cacheType: 'registry',
      flavor: [],
      pullRequestCache: false,
      extraCacheFrom: '',
      extraCacheTo: '',
      cacheKey: ['staging'],
      cacheKeyFallback: ['development'],
      context: {
        eventName: 'push',
        ref: 'refs/heads/main',
        payload: {},
        repo: { owner: 'int128', repo: 'sandbox' },
        issue: { owner: 'int128', repo: 'sandbox', number: 0 },
      },
      bakeTarget: 'docker-build-cache-config-action',
      octokit: getOctokit(),
    })
    expect(outputs.cacheFrom).toBe('type=registry,ref=ghcr.io/int128/sandbox/cache:staging')
    expect(outputs.cacheTo).toBe('type=registry,ref=ghcr.io/int128/sandbox/cache:staging,mode=max')
  })

  test('pull_request event', async () => {
    const outputs = await run({
      image: 'ghcr.io/int128/sandbox/cache',
      cacheType: 'registry',
      flavor: [],
      pullRequestCache: false,
      extraCacheFrom: '',
      extraCacheTo: '',
      cacheKey: ['pull-request-1'],
      cacheKeyFallback: ['development'],
      context: {
        eventName: 'pull_request',
        ref: 'refs/pull/1/merge',
        payload: {
          pull_request: {
            base: {
              ref: 'main',
              repo: { default_branch: 'main' },
            },
            number: 1,
          },
        },
        repo: { owner: 'int128', repo: 'sandbox' },
        issue: { owner: 'int128', repo: 'sandbox', number: 1 },
      },
      bakeTarget: 'docker-build-cache-config-action',
      octokit: getOctokit(),
    })
    expect(outputs.cacheFrom).toBe('type=registry,ref=ghcr.io/int128/sandbox/cache:development')
    expect(outputs.cacheTo).toBe('')
  })

  test('schedule event', async () => {
    const outputs = await run({
      image: 'ghcr.io/int128/sandbox/cache',
      cacheType: 'registry',
      flavor: [],
      pullRequestCache: false,
      extraCacheFrom: '',
      extraCacheTo: '',
      cacheKey: ['staging'],
      cacheKeyFallback: ['development'],
      context: {
        eventName: 'schedule',
        ref: 'refs/heads/main',
        payload: {},
        repo: { owner: 'int128', repo: 'sandbox' },
        issue: { owner: 'int128', repo: 'sandbox', number: 0 },
      },
      bakeTarget: 'docker-build-cache-config-action',
      octokit: getOctokit(),
    })
    expect(outputs.cacheFrom).toBe('type=registry,ref=ghcr.io/int128/sandbox/cache:development')
    expect(outputs.cacheTo).toBe('')
  })
})
