import fetchMock from 'fetch-mock'
import { run } from '../src/run'
import { getOctokit } from '@actions/github'

describe('Basic usage', () => {
  test('push event of main branch', async () => {
    const outputs = await run({
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      pullRequestCache: false,
      extraCacheFrom: '',
      extraCacheTo: '',
      context: {
        eventName: 'push',
        ref: 'refs/heads/main',
        payload: {},
        repo: { owner: 'int128', repo: 'sandbox' },
        issue: { owner: 'int128', repo: 'sandbox', number: 0 },
      },
      octokit: getOctokit('GITHUB_TOKEN'),
    })
    expect(outputs).toStrictEqual({
      cacheFrom: 'type=registry,ref=ghcr.io/int128/sandbox/cache:main',
      cacheTo: 'type=registry,ref=ghcr.io/int128/sandbox/cache:main,mode=max',
    })
  })

  test('pull_request event', async () => {
    const outputs = await run({
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      pullRequestCache: false,
      extraCacheFrom: '',
      extraCacheTo: '',
      context: {
        eventName: 'pull_request',
        ref: 'refs/pull/1/merge',
        payload: {
          pull_request: {
            base: {
              ref: 'main',
            },
            number: 1,
          },
        },
        repo: { owner: 'int128', repo: 'sandbox' },
        issue: { owner: 'int128', repo: 'sandbox', number: 1 },
      },
      octokit: getOctokit('GITHUB_TOKEN'),
    })
    expect(outputs).toStrictEqual({
      cacheFrom: 'type=registry,ref=ghcr.io/int128/sandbox/cache:main',
      cacheTo: '',
    })
  })

  test('issue_comment event', async () => {
    const fetch = fetchMock.sandbox().getOnce('https://api.github.com/repos/int128/sandbox/pulls/1', {
      base: {
        ref: 'main',
      },
      number: 1,
    })
    const octokit = getOctokit('GITHUB_TOKEN', { request: { fetch } })
    const outputs = await run({
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      pullRequestCache: false,
      extraCacheFrom: '',
      extraCacheTo: '',
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
      octokit,
    })
    expect(outputs).toStrictEqual({
      cacheFrom: 'type=registry,ref=ghcr.io/int128/sandbox/cache:main',
      cacheTo: '',
    })
  })
})

describe('Import and export a pull request cache', () => {
  test('pull_request event', async () => {
    const outputs = await run({
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: [],
      pullRequestCache: true,
      extraCacheFrom: '',
      extraCacheTo: '',
      context: {
        eventName: 'pull_request',
        ref: 'refs/pull/1/merge',
        payload: {
          pull_request: {
            base: {
              ref: 'main',
            },
            number: 1,
          },
        },
        repo: { owner: 'int128', repo: 'sandbox' },
        issue: { owner: 'int128', repo: 'sandbox', number: 1 },
      },
      octokit: getOctokit('GITHUB_TOKEN'),
    })
    expect(outputs).toStrictEqual({
      cacheFrom: `\
type=registry,ref=ghcr.io/int128/sandbox/cache:pr-1
type=registry,ref=ghcr.io/int128/sandbox/cache:main`,
      cacheTo: 'type=registry,ref=ghcr.io/int128/sandbox/cache:pr-1,mode=max',
    })
  })
})

describe('Build multi-architecture images', () => {
  test('push event of main branch', async () => {
    const outputs = await run({
      image: 'ghcr.io/int128/sandbox/cache',
      flavor: ['suffix=-arm64'],
      pullRequestCache: false,
      extraCacheFrom: '',
      extraCacheTo: '',
      context: {
        eventName: 'push',
        ref: 'refs/heads/main',
        payload: {},
        repo: { owner: 'int128', repo: 'sandbox' },
        issue: { owner: 'int128', repo: 'sandbox', number: 0 },
      },
      octokit: getOctokit('GITHUB_TOKEN'),
    })
    expect(outputs).toStrictEqual({
      cacheFrom: 'type=registry,ref=ghcr.io/int128/sandbox/cache:main-arm64',
      cacheTo: 'type=registry,ref=ghcr.io/int128/sandbox/cache:main-arm64,mode=max',
    })
  })
})

describe('For Amazon ECR', () => {
  test('push event of main branch', async () => {
    const outputs = await run({
      image: '123456789012.dkr.ecr.us-west-2.amazonaws.com/int128/sandbox',
      flavor: ['suffix=-cache'],
      pullRequestCache: false,
      extraCacheFrom: '',
      extraCacheTo: 'image-manifest=true',
      context: {
        eventName: 'push',
        ref: 'refs/heads/main',
        payload: {},
        repo: { owner: 'int128', repo: 'sandbox' },
        issue: { owner: 'int128', repo: 'sandbox', number: 0 },
      },
      octokit: getOctokit('GITHUB_TOKEN'),
    })
    expect(outputs).toStrictEqual({
      cacheFrom: 'type=registry,ref=123456789012.dkr.ecr.us-west-2.amazonaws.com/int128/sandbox:main-cache',
      cacheTo:
        'type=registry,ref=123456789012.dkr.ecr.us-west-2.amazonaws.com/int128/sandbox:main-cache,mode=max,image-manifest=true',
    })
  })
})
