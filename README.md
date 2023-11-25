# docker-build-cache-config-action [![ts](https://github.com/int128/docker-build-cache-config-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/docker-build-cache-config-action/actions/workflows/ts.yaml)

This action generates `cache-from` and `cache-to` inputs of [docker/build-push-action](https://github.com/docker/build-push-action) for the effective cache strategy in the pull request based development flow.

## Problem to solve

[docker/build-push-action](https://github.com/docker/build-push-action) supports the cache management using Buildx (BuildKit).
It can import and export cache by the following parameters:

```yaml
cache-from: type=registry,ref=REGISTRY/REPOSITORY:TAG
cache-to: type=registry,ref=REGISTRY/REPOSITORY:TAG,mode=max
```

If a single tag is used in the pull request based development flow, it will be overwritten and cause a cache miss.
For example,

1. Initially, the cache points to main branch
1. When a pull request B is opened,
   - It imports the cache of main branch
   - Cache hit
   - It exports the cache of pull request B
1. When a pull request C is opened,
   - It imports the cache of pull request B
   - Cache miss
   - It exports the cache of pull request C
1. When the pull request B is merged into main,
   - It imports the cache of pull request C
   - Cache miss
   - It exports the cache of main branch

## How to solve

This action generates the effective cache parameters for the pull request based development flow.
Basically,

- The cache always points to the base branch
- Don't export the cache on pull request

It reduces the time to build a container image.

![effective-build-cache-diagram](effective-build-cache-diagram.drawio.svg)

### `pull_request` event

When a pull request is opened, this action instructs docker/build-push-action to import cache of the base branch.
It does not export cache to prevent cache pollution.
For example,

```yaml
cache-from: type=registry,ref=REGISTRY/REPOSITORY:main
cache-to:
```

#### Import and export a pull request cache

When `pull-request-cache` input is set, this action instructs docker/build-push-action to import and export cache of the pull request.

```yaml
cache-from: |
  type=registry,ref=REGISTRY/REPOSITORY:pr-1
  type=registry,ref=REGISTRY/REPOSITORY:main
cache-to: type=registry,ref=REGISTRY/REPOSITORY:pr-1,mode=max
```

This is useful when you want to improve the cache between consecutive commits for a same pull request.

Note that this action creates an image tag for every pull request.
It is recommended to clean it when pull request is closed, or set a lifecycle policy in your container repository.

### `issue_comment` event (against a pull request)

When a comment is added to a pull request, this action behaves the same as `pull_request` event.

### `push` event of branch

When a branch is pushed, this action instructs docker/build-push-action to import and export cache of the branch.
For example,

```yaml
cache-from: type=registry,ref=REGISTRY/REPOSITORY:main
cache-to: type=registry,ref=REGISTRY/REPOSITORY:main,mode=max
```

### `push` event of tag

When a tag is pushed, this action instructs docker/build-push-action to import cache of the default branch.
It does not export cache to prevent cache pollution.
For example,

```yaml
cache-from: type=registry,ref=REGISTRY/REPOSITORY:main
cache-to:
```

### Other events

Otherwise, this action instructs docker/build-push-action to import cache of the triggered branch.
It does not export cache to prevent cache pollution.
For example,

```yaml
cache-from: type=registry,ref=REGISTRY/REPOSITORY:main
cache-to:
```

## Examples

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

### For multi-architecture image

You can set a tag suffix to isolate caches.

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

### For Amazon ECR

Amazon ECR now supports the cache manifest ([aws/containers-roadmap#876](https://github.com/aws/containers-roadmap/issues/876)).
This action supports the extra attribute `image-manifest=true` by `extra-cache-to` input.

Here is an example to use the cache in an Amazon ECR repository.

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
          image: ${{ steps.ecr.outputs.registry }}/${{ github.repository }}/cache
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

## Specification

### Inputs

| Name                 | Default    | Description                              |
| -------------------- | ---------- | ---------------------------------------- |
| `image`              | (required) | Image repository to import/export cache  |
| `flavor`             | -          | Flavor (multiline string)                |
| `extra-cache-from`   | -          | Extra flag to `cache-from`               |
| `extra-cache-to`     | -          | Extra flag to `cache-to`                 |
| `pull-request-cache` | -          | Import and export the pull request cache |

`flavor` is mostly compatible with [docker/metadata-action](https://github.com/docker/metadata-action#flavor-input)
except this action supports only `prefix` and `suffix`.

`extra-cache-to` is added to `cache-to` parameter only when it needs to export cache.

### Outputs

| Name         | Description                            |
| ------------ | -------------------------------------- |
| `cache-from` | Parameter for docker/build-push-action |
| `cache-to`   | Parameter for docker/build-push-action |
