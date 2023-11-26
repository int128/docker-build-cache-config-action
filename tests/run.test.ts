import fetchMock from 'fetch-mock'
import { run } from '../src/run'
import { getOctokit } from '@actions/github'

describe('integration tests', () => {
  test('push event of a branch', async () => {
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

  test('pull_request event with pullRequestCache', async () => {
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
