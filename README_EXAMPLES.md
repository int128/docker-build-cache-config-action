# Examples with docker-build-cache-config-action

- [Basic](README.md#examples)
- [Cache store](#cache-store)
  - [Store image and cache into the same repository](#store-image-and-cache-into-the-same-repository)
  - [For Amazon ECR](#for-amazon-ecr)
- [Cache strategy](#cache-strategy)
  - [Import and export a pull request cache](#import-and-export-a-pull-request-cache)
  - [Build multi-architecture images](#build-multi-architecture-images)
  - [For monorepo](#for-monorepo)
  - [Build multiple image tags from a branch](#build-multiple-image-tags-from-a-branch)
- [Cache backend type](#cache-backend-type)
  - [Use GitHub Actions cache backend](#use-github-actions-cache-backend)

## Cache store

### Store image and cache into the same repository

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

## Cache strategy

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

## Cache backend type

To ensure fast builds, BuildKit automatically caches the build result in its own internal cache. Additionally, BuildKit also supports exporting build cache to an external location, making it possible to import in future builds.

Ref: https://docs.docker.com/build/cache/backends/

You can set the `cache-type` to configure the backend to use.

```yaml
- uses: int128/docker-build-cache-config-action@v1
  id: cache
  with:
    image: ghcr.io/${{ github.repository }}/cache
    cache-type: inline # cache backend storage
```

Will generate the following outputs

```yaml
cache-from: |
  type=inline,ref=REGISTRY/REPOSITORY:pr-1
  type=inline,ref=REGISTRY/REPOSITORY:main
cache-to: type=inline,ref=REGISTRY/REPOSITORY:pr-1,mode=max
```

### Use GitHub Actions cache backend

> The GitHub Actions cache utilizes the GitHub-provided Action's cache or other cache services supporting the GitHub Actions cache protocol. This is the recommended cache to use inside your GitHub Actions workflows, as long as your use case falls within the size and usage limits set by GitHub.
> ⚠ This is an experimental feature. The interface and behavior are unstable and may change in future releases.

Ref: https://docs.docker.com/build/cache/backends/gha/

You can set the cache type to `gha` to use the GitHub Actions cache.

```yaml
- uses: docker/metadata-action@v3
  id: metadata
  with:
    images: ghcr.io/${{ github.repository }}
- uses: int128/docker-build-cache-config-action@v1
  id: cache
  with:
    image: ghcr.io/${{ github.repository }}/cache
    cache-type: gha
- uses: docker/build-push-action@v2
  id: build
  with:
    push: true
    tags: ${{ steps.metadata.outputs.tags }}
    labels: ${{ steps.metadata.outputs.labels }}
    cache-from: ${{ steps.cache.outputs.cache-from }}
    cache-to: ${{ steps.cache.outputs.cache-to }}
```
