# docker-cache-params-action [![ts](https://github.com/int128/docker-cache-params-action/actions/workflows/ts.yaml/badge.svg)](https://github.com/int128/docker-cache-params-action/actions/workflows/ts.yaml)

This is an action to provide `cache-from` and `cache-to` parameters to [docker/build-push-action](https://github.com/docker/build-push-action) for effective build cache.


## Getting Started

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
      - uses: int128/docker-cache-params-action@v1
        id: cache-params
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
          cache-from: ${{ steps.cache-params.outputs.cache-from }}
          cache-to: ${{ steps.cache-params.outputs.cache-to }}
```


## Inputs

| Name | Default | Description
|------|----------|------------
| `image` | (required) | Image name to import/export cache


## Outputs

| Name | Description
|------|------------
| `cache-from` | Parameter for docker/build-push-action
| `cache-to` | Parameter for docker/build-push-action
