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

### Basic usage

Here is an example to manage a cache in GHCR (GitHub Container Registry).

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

### Store image and cache into a repository

You can set a tag suffix to store both image and cache into the same repository.

```yaml
- uses: docker/metadata-action@v3
  id: metadata
  with:
    images: ghcr.io/${{ github.repository }}
- uses: int128/docker-build-cache-config-action@v1
  id: cache
  with:
    image: ghcr.io/${{ github.repository }}
    flavor: suffix=-cache
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
ghcr.io/${{ github.repository }}:main-cache
ghcr.io/${{ github.repository }}:pr-1
```

### For Amazon ECR

Amazon ECR now supports the cache manifest ([aws/containers-roadmap#876](https://github.com/aws/containers-roadmap/issues/876)).
You can pass the extra attribute `image-manifest=true`.
Here is an example to manage a cache in Amazon ECR.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    outputs:
      image-uri: ${{ steps.ecr.outputs.registry }}/${{ github.repository }}@${{ steps.build.outputs.digest }}
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::ACCOUNT:role/ROLE
      - uses: aws-actions/amazon-ecr-login@v1
        id: ecr
      - uses: docker/metadata-action@v5
        id: metadata
        with:
          images: ${{ steps.ecr.outputs.registry }}/${{ github.repository }}
      - uses: int128/docker-build-cache-config-action@v1
        id: cache
        with:
          image: ${{ steps.ecr.outputs.registry }}/${{ github.repository }}
          suffix: -cache
          extra-cache-to: image-manifest=true
      - uses: docker/build-push-action@v5
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
ACCOUNT.dkr.ecr.REGION.amazonaws.com/${{ github.repository }}:main
ACCOUNT.dkr.ecr.REGION.amazonaws.com/${{ github.repository }}:pr-1
ACCOUNT.dkr.ecr.REGION.amazonaws.com/${{ github.repository }}:main-cache
```

## Advanced cache strategy

### Import and export a pull request cache

When a pull request is pushed, it can export a cache to a dedicated tag for the consecutive commits.
It imports the cache from the dedicated tag when the pull request is pushed again.

```yaml
cache-from: |
  type=registry,ref=REGISTRY/REPOSITORY:pr-1
  type=registry,ref=REGISTRY/REPOSITORY:main
cache-to: type=registry,ref=REGISTRY/REPOSITORY:pr-1,mode=max
```

Here is an example to enable the pull request cache feature.

```yaml
- uses: docker/metadata-action@v3
  id: metadata
  with:
    images: ghcr.io/${{ github.repository }}
- uses: int128/docker-build-cache-config-action@v1
  id: cache
  with:
    image: ghcr.io/${{ github.repository }}/cache
    pull-request-cache: true
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
ghcr.io/${{ github.repository }}/cache:pr-1
```

Note that it creates an image tag for every pull request.
It is recommended to clean it when pull request is closed, or set a lifecycle policy into your container repository.

### Build multi-architecture images

You can set a tag suffix to isolate caches for each architecture.

```yaml
jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        platform:
          - linux/amd64
          - linux/arm64
    steps:
      - uses: docker/metadata-action@v3
        id: metadata
        with:
          images: ghcr.io/${{ github.repository }}
          flavor: suffix=-${{ matrix.platform }}
      - uses: int128/docker-build-cache-config-action@v1
        id: cache
        with:
          image: ghcr.io/${{ github.repository }}/cache
          flavor: suffix=-${{ matrix.platform }}
      - uses: docker/build-push-action@v2
        id: build
        with:
          push: true
          tags: ${{ steps.metadata.outputs.tags }}
          labels: ${{ steps.metadata.outputs.labels }}
          cache-from: ${{ steps.cache.outputs.cache-from }}
          cache-to: ${{ steps.cache.outputs.cache-to }}
          platforms: ${{ matrix.platform }}
```

It will create the following image tags:

```
ghcr.io/${{ github.repository }}:main-linux-amd64
ghcr.io/${{ github.repository }}:main-linux-arm64
ghcr.io/${{ github.repository }}:pr-1-linux-amd64
ghcr.io/${{ github.repository }}:pr-1-linux-arm64
ghcr.io/${{ github.repository }}/cache:main-linux-amd64
ghcr.io/${{ github.repository }}/cache:main-linux-arm64
```

### For monorepo

You can set a tag prefix to store caches of multiple images into a single repository.

```yaml
- uses: docker/metadata-action@v3
  id: metadata
  with:
    images: ghcr.io/${{ github.repository }}/microservice-name
- uses: int128/docker-build-cache-config-action@v1
  id: cache
  with:
    image: ghcr.io/${{ github.repository }}/cache
    flavor: prefix=microservice-name--
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
ghcr.io/${{ github.repository }}/microservice-name:main
ghcr.io/${{ github.repository }}/microservice-name:pr-1
ghcr.io/${{ github.repository }}/cache:microservice-name--main
```

### Build multiple image tags from a branch

For a complex project, it needs to build multiple image tags from a branch.
For example, it builds the following images when the main branch is pushed:

- Build an image tag `development` with the build-args of development environment
- Build an image tag `staging` with the build-args of staging environment

In this case, it needs to separate the cache for each environment as follows:

- When the main branch is pushed,
  - A job builds an image for the development environment.
    It imports and exports a cache from/to `development` tag.
  - A job builds an image for the staging environment.
    It imports and exports a cache from/to `staging` tag.
- When a pull request is created or updated,
  - A job builds an image for the pull request environment.
    It imports a cache from `development` tag.

You can set a suffix to separate the caches for each environment.

```yaml
jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        environment:
          - development
          - staging
    steps:
      - uses: docker/metadata-action@v3
        id: metadata
        with:
          images: ghcr.io/${{ github.repository }}
          flavor: suffix=-${{ matrix.environment }}
      - uses: int128/docker-build-cache-config-action@v1
        id: cache
        with:
          image: ghcr.io/${{ github.repository }}/cache
          cache-key: ${{ matrix.environment }}
          cache-key-fallback: development
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
ghcr.io/${{ github.repository }}:development
ghcr.io/${{ github.repository }}:staging
ghcr.io/${{ github.repository }}/cache:development
ghcr.io/${{ github.repository }}/cache:staging
```

## Specification

### Inputs

| Name                 | Default    | Description                             |
| -------------------- | ---------- | --------------------------------------- |
| `image`              | (required) | Image repository to import/export cache |
| `flavor`             | -          | Flavor (multiline string)               |
| `extra-cache-from`   | -          | Extra flag to `cache-from`              |
| `extra-cache-to`     | -          | Extra flag to `cache-to`                |
| `pull-request-cache` | -          | Import and export a pull request cache  |
| `cache-key`          | -          | Cache key                               |
| `cache-key-fallback` | -          | Cache key fallback                      |

`flavor` is mostly compatible with [docker/metadata-action](https://github.com/docker/metadata-action#flavor-input)
except this action supports only `prefix` and `suffix`.

`extra-cache-to` is added to `cache-to` parameter only when it needs to export cache.

If `cache-key` is not set, it is inferred from the branch name or pull request number, e.g., `main` or `pr-1`.

### Outputs

| Name         | Description                            |
| ------------ | -------------------------------------- |
| `cache-from` | Parameter for docker/build-push-action |
| `cache-to`   | Parameter for docker/build-push-action |

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
