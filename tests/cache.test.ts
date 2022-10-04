import * as cache from '../src/cache'

const payloadRepository = {
  repository: {
    default_branch: 'main',
    name: 'sandbox',
    owner: { login: 'int128' },
  },
}

const eventPullRequest = {
  eventName: 'pull_request',
  ref: 'refs/pulls/123/merge',
  payload: {
    pull_request: {
      number: 123,
      base: {
        ref: 'main',
      },
      head: {
        ref: 'feature',
      },
    },
    ...payloadRepository,
  },
}

const eventPushBranch = {
  eventName: 'push',
  ref: 'refs/heads/feature',
  payload: {
    ...payloadRepository,
  },
}

const eventPushTag = {
  eventName: 'push',
  ref: 'refs/tags/v1.0.0',
  payload: {
    ...payloadRepository,
  },
}

const eventReleaseTag = {
  eventName: 'release',
  ref: 'refs/tags/v1.0.0',
  payload: {
    ...payloadRepository,
  },
}

const eventSchedule = {
  eventName: 'schedule',
  ref: 'refs/heads/schedule',
  payload: {
    ...payloadRepository,
  },
}

const inputs = {
  image: 'ghcr.io/int128/sandbox/cache',
  tagPrefix: [],
}

const inputsPrefixed = {
  image: 'ghcr.io/int128/sandbox/cache',
  tagPrefix: ['prefix-', 'prefix-b-'],
}

test('on pull request', () => {
  const c = cache.infer(eventPullRequest, inputs)
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:feature', 'ghcr.io/int128/sandbox/cache:main'],
    to: [],
  })
})

test('on pull request with prefix', () => {
  const c = cache.infer(eventPullRequest, inputsPrefixed)
  expect(c).toStrictEqual({
    from: [
      'ghcr.io/int128/sandbox/cache:prefix-feature',
      'ghcr.io/int128/sandbox/cache:prefix-main',
      'ghcr.io/int128/sandbox/cache:prefix-b-feature',
      'ghcr.io/int128/sandbox/cache:prefix-b-main',
      'ghcr.io/int128/sandbox/cache:feature',
      'ghcr.io/int128/sandbox/cache:main',
    ],
    to: [],
  })
})

test('on push branch', () => {
  const c = cache.infer(eventPushBranch, inputs)
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:feature', 'ghcr.io/int128/sandbox/cache:main'],
    to: ['ghcr.io/int128/sandbox/cache:feature'],
  })
})

test('on push branch with prefix', () => {
  const c = cache.infer(eventPushBranch, inputsPrefixed)
  expect(c).toStrictEqual({
    from: [
      'ghcr.io/int128/sandbox/cache:prefix-feature',
      'ghcr.io/int128/sandbox/cache:prefix-b-feature',
      'ghcr.io/int128/sandbox/cache:feature',
      'ghcr.io/int128/sandbox/cache:prefix-main',
      'ghcr.io/int128/sandbox/cache:prefix-b-main',
      'ghcr.io/int128/sandbox/cache:main',
    ],
    to: ['ghcr.io/int128/sandbox/cache:prefix-feature'],
  })
})

test('on push tag', () => {
  const c = cache.infer(eventPushTag, inputs)
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:main'],
    to: [],
  })
})

test('on push tag with prefix', () => {
  const c = cache.infer(eventPushTag, inputsPrefixed)
  expect(c).toStrictEqual({
    from: [
      'ghcr.io/int128/sandbox/cache:prefix-main',
      'ghcr.io/int128/sandbox/cache:prefix-b-main',
      'ghcr.io/int128/sandbox/cache:main',
    ],
    to: [],
  })
})

test('on release tag', () => {
  const c = cache.infer(eventReleaseTag, inputs)
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:main'],
    to: [],
  })
})

test('on release tag with prefix', () => {
  const c = cache.infer(eventReleaseTag, inputsPrefixed)
  expect(c).toStrictEqual({
    from: [
      'ghcr.io/int128/sandbox/cache:prefix-main',
      'ghcr.io/int128/sandbox/cache:prefix-b-main',
      'ghcr.io/int128/sandbox/cache:main',
    ],
    to: [],
  })
})

test('on schedule', () => {
  const c = cache.infer(eventSchedule, inputs)
  expect(c).toStrictEqual({
    from: ['ghcr.io/int128/sandbox/cache:schedule', 'ghcr.io/int128/sandbox/cache:main'],
    to: [],
  })
})

test('on schedule with prefix', () => {
  const c = cache.infer(eventSchedule, inputsPrefixed)
  expect(c).toStrictEqual({
    from: [
      'ghcr.io/int128/sandbox/cache:prefix-schedule',
      'ghcr.io/int128/sandbox/cache:prefix-b-schedule',
      'ghcr.io/int128/sandbox/cache:schedule',
      'ghcr.io/int128/sandbox/cache:prefix-main',
      'ghcr.io/int128/sandbox/cache:prefix-b-main',
      'ghcr.io/int128/sandbox/cache:main',
    ],
    to: [],
  })
})
