import { Octokit } from '@octokit/action'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

export const server = setupServer(
  http.get('https://api.github.com/repos/int128/sandbox/pulls/1', () =>
    HttpResponse.json({
      base: {
        ref: 'main',
        repo: { default_branch: 'main' },
      },
      number: 1,
    }),
  ),
  http.get('https://api.github.com/repos/int128/sandbox/pulls/123', () =>
    HttpResponse.json({
      base: {
        ref: 'main',
        repo: { default_branch: 'main' },
      },
      number: 123,
    }),
  ),
)

export const getOctokit = () =>
  new Octokit({
    authStrategy: null,
    request: { fetch },
  })
