# docker-build-cache-config-action [![ts](https://github.com/int128/docker-build-cache-config-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/docker-build-cache-config-action/actions/workflows/ts.yaml)

This is an action to provide `cache-from` and `cache-to` parameters to [docker/build-push-action](https://github.com/docker/build-push-action) for effective build cache.


## Problem to solve

Docker BuildKit supports cache.
For example, it imports and exports cache by the following parameters:

```yaml
cache-from: type=registry,ref=IMAGE
cache-to: type=registry,ref=IMAGE,mode=max
```

For pull request based development flow, cache efficiency is extremely decreased as follows:

1. Cache is created from `main` branch
1. When pull request A is opened,
    - Cache hit
    - Cache is overwritten to the branch of A
1. When pull request B is opened, cache is missed
    - Cache miss
    - Cache is overwritten to the branch of B
1. When pull request A is merged into main,
    - Cache miss
    - Cache is overwritten to `main` branch


## Solution

When a branch is pushed, this action instructs docker/build-push-action to import and export cache with the name of branch.
For example,

```yaml
cache-from: type=registry,ref=IMAGE:main
cache-to: type=registry,ref=IMAGE:main,mode=max
```

When a pull request is opened, this action instructs docker/build-push-action to import cache with the name of base branch.
It does not export cache.
For example,

```yaml
cache-from: type=registry,ref=IMAGE:main
cache-to:
```

Otherwise, this action instructs docker/build-push-action to import cache with the name of default branch.
For example,

```yaml
cache-from: type=registry,ref=IMAGE:main
cache-to:
```


## Example

Here is an typical usecase to push an image to GHCR:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: docker/metadata-action@v3
        id: metadata
        with:
          images: ghcr.io/${{ github.repository }}
      - uses: int128/docker-build-cache-config-action@v1
        id: cache
        with:
          image: ghcr.io/${{ github.repository }}/cache
      - uses: docker/login-action@v1
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/setup-buildx-action@v1
      - uses: docker/build-push-action@v2
        id: build
        with:
          push: true
          tags: ${{ steps.metadata.outputs.tags }}
          labels: ${{ steps.metadata.outputs.labels }}
          cache-from: ${{ steps.cache.outputs.cache-from }}
          cache-to: ${{ steps.cache.outputs.cache-to }}
```

For monorepo, you can set a tag prefix to isolate caches.

```yaml
      - uses: int128/docker-cache-params-action@v1
        id: cache-params
        with:
          image: ghcr.io/${{ github.repository }}/cache
          tag-prefix: microservice-name
```


## Inputs

| Name | Default | Description
|------|----------|------------
| `image` | (required) | Image name to import/export cache
| `tag-prefix` | ` ` | Prefix of tag


## Outputs

| Name | Description
|------|------------
| `cache-from` | Parameter for docker/build-push-action
| `cache-to` | Parameter for docker/build-push-action
