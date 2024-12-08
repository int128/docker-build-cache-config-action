target "docker-metadata-action" {}

target "docker-build-cache-config-action" {}

target "default" {
  inherits = ["docker-metadata-action", "docker-build-cache-config-action"]
  context = "."
  dockerfile = "Dockerfile"
}
