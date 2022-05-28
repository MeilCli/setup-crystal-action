# setup-crystal-action
[![CI-Master](https://github.com/MeilCli/setup-crystal-action/actions/workflows/ci-master.yml/badge.svg)](https://github.com/MeilCli/setup-crystal-action/actions/workflows/ci-master.yml)  
setup Crystal action for GitHub Actions.  

## Required
`setup-crystal-action` must execute on Linux or macOS, because I do not know usage that WSL on GitHub Actions.

## Example
```yaml
name: CI

on: 
  push:
    branches:    
    - master
  pull_request:
    branches:
    - master

jobs:
  example:
    runs-on: ubuntu-20.04
    steps:
      - uses: MeilCli/setup-crystal-action@v4
        with: 
          crystal_version: latest
          shards_version: latest
      - name: Run Crystal
        run: |
          echo 'puts "Hello Crystal"' > hello.cr
          crystal run hello.cr
```

You can also pin to a [specific release](https://github.com/MeilCli/setup-crystal-action/releases) version in the format `@v4.x.x`

## input
- `crystal_version`
  - required
  - install crystal version
  - value: `latest` or version value, see [crystal-lang/crystal](https://github.com/crystal-lang/crystal/releases)
  - default: `latest`
- `shards_version`
  - required
  - install shards version
  - value: `latest` or `skip` or version value, see [crystal-lang/shards](https://github.com/crystal-lang/shards/releases)
    - if set `skip`, not install shards
  - default: `latest`
- `github_token`
  - github token, using get GitHub Release of crystal-lang/crystal or crystal-lang/shards
  - default: `${{ github.token }}`
- `cache_mode`
  - cache mode
  - value: `none`, `tool-cache` or `cache`
  - default: `cache`
  - `tool-cache`
    - using: [@actions/tool-cache](https://github.com/actions/toolkit/tree/main/packages/tool-cache)
    - works in most cases with Self-Hosted Runner
  - `cache`
    - using: [@actions/cache](https://github.com/actions/toolkit/tree/main/packages/cache)
    - works the same as [actions/cache](https://github.com/actions/cache)
- `cache_prefix`
  - if selected `cache` on cache_mode, option that prefix of cache key
  - Recommended use when parallel jobs
- `install_root`
  - if selected `none` or `cache` on cache_mode, use directory that dicide at this option
  - default: `${{ runner.temp }}`

## output
- `installed_crystal_json`
  - installed json that GitHub Release Asset
- `installed_shards_json`
  - installed json that GitHub Release

## Contributes
[<img src="https://gist.github.com/MeilCli/828476d51fc9574c495db18e559ed364/raw/3c739e396eb021930edb0a5e5d7a94871bc98042/metrics_contributors.svg">](https://github.com/MeilCli/setup-crystal-action/graphs/contributors)

### Could you want to contribute?
see [Contributing.md](./.github/CONTRIBUTING.md)

## License
[<img src="https://gist.github.com/MeilCli/828476d51fc9574c495db18e559ed364/raw/3c739e396eb021930edb0a5e5d7a94871bc98042/metrics_licenses.svg">](LICENSE)