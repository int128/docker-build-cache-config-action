# docker-build-cache-config-action [![ts](https://github.com/int128/docker-build-cache-config-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/docker-build-cache-config-action/actions/workflows/ts.yaml)

This action generates `cache-from` and `cache-to` inputs of [docker/build-push-action](https://github.com/docker/build-push-action) for the effective cache strategy in the pull request based development flow.

## Problem to solve

[docker/build-push-action](https://github.com/docker/build-push-action) supports the cache management using Buildx (BuildKit).
It can import and export a cache by the following parameters:

```yaml
cache-from: type=registry,ref=REGISTRY/REPOSITORY:TAG
cache-to: type=registry,ref=REGISTRY/REPOSITORY:TAG,mode=max
```

If a same tag is used in the pull request based development flow, it will cause a cache miss.
For example,

1. Initially, the cache points to main branch
1. When a pull request B is opened,
   - It imports the cache of main branch
   - The cache hits
   - It exports the cache of pull request B
1. When a pull request C is opened,
   - It imports the cache of pull request B
   - The cache misses
   - It exports the cache of pull request C
1. When the pull request B is merged into main,
   - It imports the cache of pull request C
   - The cache misses
   - It exports the cache of main branch

Therefore, it needs to prevent the cache pollution caused by a pull request.

## How to solve

Keep a cache tag tracking the corresponding branch.

When the main branch is pushed, it imports a cache from the main tag.
It finally exports a cache to the main tag for the future build.

```yaml
cache-from: type=registry,ref=REGISTRY/REPOSITORY:main
cache-to: type=registry,ref=REGISTRY/REPOSITORY:main,mode=max
```

When a pull request is created or updated, it only imports a cache from the main tag.
It does not export a cache to the main tag to prevent the cache pollution.

```yaml
cache-from: type=registry,ref=REGISTRY/REPOSITORY:main
cache-to:
```

If the base branch of the pull request is not main, it imports both base tag and main tag.

```yaml
cache-from: |
  type=registry,ref=REGISTRY/REPOSITORY:base
  type=registry,ref=REGISTRY/REPOSITORY:main
cache-to:
```

Here is the diagram of this cache strategy.

![effective-build-cache-diagram](effective-build-cache-diagram.drawio.svg)

This action generates the cache parameters by this strategy.

```yaml
- uses: int128/docker-build-cache-config-action@v1
  id: cache
  with:
    image: ghcr.io/${{ github.repository }}/cache
- uses: docker/build-push-action@v2
  with:
    cache-from: ${{ steps.cache.outputs.cache-from }}
    cache-to: ${{ steps.cache.outputs.cache-to }}
```

## Examples

### Build with docker/build-push-action

Here is an example to build a container image with [docker/build-push-action](https://github.com/docker/build-push-action).

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

It will create the following image tags:

```
ghcr.io/${{ github.repository }}:main
ghcr.io/${{ github.repository }}:pr-1
ghcr.io/${{ github.repository }}/cache:main
```

See [README_EXAMPLES.md](README_EXAMPLES.md) for more examples.

### Build with docker/bake-action

Here is an example to build a container image with [docker/bake-action](https://github.com/docker/bake-action).

```yaml
- uses: docker/metadata-action@v3
  id: metadata
  with:
    images: ghcr.io/${{ github.repository }}
- uses: int128/docker-build-cache-config-action@v1
  id: cache
  with:
    image: ghcr.io/${{ github.repository }}/cache
- uses: docker/bake-action@v5
  id: build
  with:
    push: true
    files: |
      ./docker-bake.hcl
      ${{ steps.metadata.outputs.bake-file }}
      ${{ steps.cache.outputs.bake-file }}
```

```hcl
target "docker-metadata-action" {}

target "docker-build-cache-config-action" {}

target "default" {
  inherits = ["docker-metadata-action", "docker-build-cache-config-action"]
  context = "."
}
```

## Specification

### Inputs

| Name                 | Default                            | Description                                                                                    |
| -------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `image`              | (required)                         | Image repository to import/export cache                                                        |
| `cache-type`         | `registry`                         | Type of cache backend (for source and destination). Can be registry, local, inline, gha and s3 |
| `flavor`             | -                                  | Flavor (multiline string)                                                                      |
| `extra-cache-from`   | -                                  | Extra flag to `cache-from`                                                                     |
| `extra-cache-to`     | -                                  | Extra flag to `cache-to`                                                                       |
| `pull-request-cache` | -                                  | Import and export a pull request cache                                                         |
| `cache-key`          | -                                  | Custom cache key                                                                               |
| `cache-key-fallback` | -                                  | Custom cache key to fallback                                                                   |
| `bake-target`        | `docker-build-cache-config-action` | Bake target name                                                                               |

`flavor` is mostly compatible with [docker/metadata-action](https://github.com/docker/metadata-action#flavor-input)
except this action supports only `prefix` and `suffix`.

`extra-cache-to` is added to `cache-to` parameter only when it needs to export cache.

Note that `cache-key` and `cache-key-fallback` are experimental.
The specification may change in the future.

### Outputs

| Name         | Description                            |
| ------------ | -------------------------------------- |
| `cache-from` | Parameter for docker/build-push-action |
| `cache-to`   | Parameter for docker/build-push-action |
| `bake-file`  | Bake definition file                   |

### Events

This action exports a cache on the following events:

- `push` event to a branch
  - Export a cache to the tag corresponding to the pushed branch
- `pull_request` event
  - Export a cache to the tag corresponding to the pull request number (only if `pull-request-cache` is set)
- `issue_comment` event to a pull request
  - Export a cache to the tag corresponding to the pull request number (only if `pull-request-cache` is set)
- Other events
  - Export nothing

It imports a cache on the following events:

- `push` event to a branch
  - Import a cache from the tag corresponding to the pushed branch
- `pull_request` event
  - Import a cache from the tag corresponding to the pull request number
  - Import a cache from the tag corresponding to the base branch
  - Import a cache from the tag corresponding to the default branch
- `issue_comment` event to a pull request
  - Import a cache from the tag corresponding to the pull request number
  - Import a cache from the tag corresponding to the base branch
  - Import a cache from the tag corresponding to the default branch
- Other events
  - Import a cache from the tag corresponding to the default branch
