# docker-build-cache-config-action [![ts](https://github.com/int128/docker-build-cache-config-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/docker-build-cache-config-action/actions/workflows/ts.yaml)

This is an action to generate `cache-from` and `cache-to` inputs of [docker/build-push-action](https://github.com/docker/build-push-action) for effective cache in pull request based development flow.


## Problem to solve

Docker BuildKit supports cache.
It imports and exports cache by the following parameters:

```yaml
cache-from: type=registry,ref=IMAGE
cache-to: type=registry,ref=IMAGE,mode=max
```

In pull request based development flow, cache is overwritten by pull requests and it causes cache miss.
For example,

1. Initially cache is set to `main` branch
1. When pull request B is opened,
    - Cache hit
    - Cache is overwritten to B
1. When pull request C is opened,
    - Cache miss
    - Cache is overwritten to C
1. When pull request B is merged into main,
    - Cache miss
    - Cache is overwritten to `main` branch


## Solution

This action generates effective cache config for pull request based development flow.
Basically,

- Cache always points to base branch
- Don't export cache on pull request

It would reduce time of docker build.

![effective-build-cache-diagram](effective-build-cache-diagram.drawio.svg)


### `pull_request` event

When a pull request is opened, this action instructs docker/build-push-action to import cache of the pull request branch with a fallback to the base branch and the default branch.
It does not export cache to prevent cache pollution.
For example,

```yaml
cache-from: |
  type=registry,ref=IMAGE:head
  type=registry,ref=IMAGE:base
  type=registry,ref=IMAGE:main
cache-to:
```

### `push` event of branch

When a branch is pushed, this action instructs docker/build-push-action to import and export cache of the branch with a fallback to the default branch.
For example,

```yaml
cache-from: |
  type=registry,ref=IMAGE:head
  type=registry,ref=IMAGE:main
cache-to: |
  type=registry,ref=IMAGE:main,mode=max
```

### `push` event of tag

When a tag is pushed, this action instructs docker/build-push-action to import cache of the default branch.
It does not export cache to prevent cache pollution.
For example,

```yaml
cache-from: |
  type=registry,ref=IMAGE:main
cache-to:
```

### Others

Otherwise, this action instructs docker/build-push-action to import cache of the triggered branch with a fallback to the default branch.
It does not export cache to prevent cache pollution.
For example,

```yaml
cache-from: |
  type=registry,ref=IMAGE:head
  type=registry,ref=IMAGE:main
cache-to:
```


## Example

Here is an example to use cache on GHCR (GitHub Container Registry).

```yaml
      - uses: docker/metadata-action@v3
        id: metadata
        with:
          images: ghcr.io/${{ github.repository }}
      - uses: int128/docker-build-cache-config-action@v1
        id: cache
        with:
          image: ghcr.io/${{ github.repository }}/cache
      - uses: docker/build-push-action@v2
        id: build
        with:
          push: true
          tags: ${{ steps.metadata.outputs.tags }}
          labels: ${{ steps.metadata.outputs.labels }}
          cache-from: ${{ steps.cache.outputs.cache-from }}
          cache-to: ${{ steps.cache.outputs.cache-to }}
```

### For monorepo

You can set a tag prefix to isolate caches.

```yaml
      - uses: docker/metadata-action@v3
        id: metadata
        with:
          images: ghcr.io/${{ github.repository }}/microservice-name
      - uses: int128/docker-build-cache-config-action@v1
        id: cache
        with:
          image: ghcr.io/${{ github.repository }}/cache
          tag-prefix: |
            microservice-name--
      - uses: docker/build-push-action@v2
        id: build
        with:
          push: true
          tags: ${{ steps.metadata.outputs.tags }}
          labels: ${{ steps.metadata.outputs.labels }}
          cache-from: ${{ steps.cache.outputs.cache-from }}
          cache-to: ${{ steps.cache.outputs.cache-to }}
```


## Inputs

| Name | Default | Description
|------|----------|------------
| `image` | (required) | Image name to import/export cache
| `tag-prefix` | `[]` | An array of tag prefixes


## Outputs

| Name | Description
|------|------------
| `cache-from` | Parameter for docker/build-push-action
| `cache-to` | Parameter for docker/build-push-action
