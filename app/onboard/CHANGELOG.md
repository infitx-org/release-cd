# Changelog

## [2.3.5](https://github.com/infitx-org/onboard/compare/v2.3.4...v2.3.5) (2025-05-28)


### Bug Fixes

* move auth in the onboard function ([85e7f10](https://github.com/infitx-org/onboard/commit/85e7f108ad8d5846e6734f48d46572a4654464fe))

## [2.3.4](https://github.com/infitx-org/onboard/compare/v2.3.3...v2.3.4) (2025-05-16)


### Bug Fixes

* avoid pointless retries ([1eac359](https://github.com/infitx-org/onboard/commit/1eac35913bdfe3d427044ce5b94113f13aa609e6))

## [2.3.3](https://github.com/infitx-org/onboard/compare/v2.3.2...v2.3.3) (2025-05-16)


### Bug Fixes

* enhance error logging with detailed request and response information ([f60fbd4](https://github.com/infitx-org/onboard/commit/f60fbd427c2237bd2fee4e014eda5d0f9dc268f9))
* enhance onboarding process with timeout and retry logic ([878e969](https://github.com/infitx-org/onboard/commit/878e969ae3cc46f04ba378d6c5bb030de7c6c250))
* sign all CSRs in the array ([54d127b](https://github.com/infitx-org/onboard/commit/54d127bf06e40d65f4206d060240a3ae76c53db2))

## [2.3.2](https://github.com/infitx-org/onboard/compare/v2.3.1...v2.3.2) (2025-05-15)


### Bug Fixes

* extend retry logic to refresh secrets every hour ([0d67217](https://github.com/infitx-org/onboard/commit/0d672172218c3d1a96f4eefd60e3409e86fdeb86))

## [2.3.1](https://github.com/infitx-org/onboard/compare/v2.3.0...v2.3.1) (2025-05-02)


### Bug Fixes

* return empty array for missing secrets in the current environment ([015f89f](https://github.com/infitx-org/onboard/commit/015f89fa7c3a5e51e504174cc11ebbcbac9ae6a6))

## [2.3.0](https://github.com/infitx-org/onboard/compare/v2.2.0...v2.3.0) (2025-05-02)


### Features

* implement retry logic for secret fetching ([b078313](https://github.com/infitx-org/onboard/commit/b078313648b23d35d673605e68387d18821da389))

## [2.2.0](https://github.com/infitx-org/onboard/compare/v2.1.10...v2.2.0) (2025-04-28)


### Features

* add RetryError class for improved error handling and implement retry logic for secret fetching ([8bddab6](https://github.com/infitx-org/onboard/commit/8bddab6553bdb00ffa57521fb3a390cff0a1daba))

## [2.1.10](https://github.com/infitx-org/onboard/compare/v2.1.9...v2.1.10) (2025-04-28)


### Bug Fixes

* improve error logging and add health check delay before onboarding ([9d598c1](https://github.com/infitx-org/onboard/commit/9d598c1aab77d2e103b576b9c204653c5c8b9c86))

## [2.1.9](https://github.com/infitx-org/onboard/compare/v2.1.8...v2.1.9) (2025-04-25)


### Bug Fixes

* move contentType declaration outside of conditional block and add null check for secrets log ([911638d](https://github.com/infitx-org/onboard/commit/911638d401774453bcbfa70fa4dfda646a9f8c4a))

## [2.1.8](https://github.com/infitx-org/onboard/compare/v2.1.7...v2.1.8) (2025-04-25)


### Bug Fixes

* refactor error logging to use dedicated logError function ([157f754](https://github.com/infitx-org/onboard/commit/157f7546254018b072796a70b79c89eb1ea249a8))

## [2.1.7](https://github.com/infitx-org/onboard/compare/v2.1.6...v2.1.7) (2025-04-25)


### Bug Fixes

* improve health check response handling in dummy server ([6c125a6](https://github.com/infitx-org/onboard/commit/6c125a66ee9c1198dc554976ffbc9077b334edf9))

## [2.1.6](https://github.com/infitx-org/onboard/compare/v2.1.5...v2.1.6) (2025-04-25)


### Bug Fixes

* ensure keycloak authentication is performed in getKeycloakSecrets function ([6aeac5b](https://github.com/infitx-org/onboard/commit/6aeac5b78034a3648c5e467f2024866346ec1e7c))

## [2.1.5](https://github.com/infitx-org/onboard/compare/v2.1.4...v2.1.5) (2025-04-25)


### Bug Fixes

* correct server variable declaration in dummy server creation ([f592e1e](https://github.com/infitx-org/onboard/commit/f592e1ef314af1094383f5142c07c12299fd78bb))

## [2.1.4](https://github.com/infitx-org/onboard/compare/v2.1.3...v2.1.4) (2025-04-25)


### Bug Fixes

* add optional chaining for dfsps length checks ([a5c8ea4](https://github.com/infitx-org/onboard/commit/a5c8ea4a7938a8deb8a37d5ff137509ceaa8b33a))

## [2.1.3](https://github.com/infitx-org/onboard/compare/v2.1.2...v2.1.3) (2025-04-25)


### Bug Fixes

* update downstream workflow trigger ([cd24aa9](https://github.com/infitx-org/onboard/commit/cd24aa9e3f8346e4208b871c04206f0a57590786))

## [2.1.2](https://github.com/infitx-org/onboard/compare/v2.1.1...v2.1.2) (2025-04-25)


### Bug Fixes

* remove unused dockerfile input from downstream workflow trigger ([3618252](https://github.com/infitx-org/onboard/commit/3618252b60041b437e03f99e8720805b7654abfd))

## [2.1.1](https://github.com/infitx-org/onboard/compare/v2.1.0...v2.1.1) (2025-04-25)


### Bug Fixes

* update image reference in downstream workflow trigger ([84c3423](https://github.com/infitx-org/onboard/commit/84c34236dc712e95daf9c7e87ffdb141eeb957ec))

## [2.1.0](https://github.com/infitx-org/onboard/compare/v2.0.2...v2.1.0) (2025-04-25)


### Features

* add repository dispatch step to trigger downstream workflow ([fccfa5f](https://github.com/infitx-org/onboard/commit/fccfa5f4c3caee53c18479a20702107eaccb5534))


### Bug Fixes

* move keycloakAdminVS init ([7b6d663](https://github.com/infitx-org/onboard/commit/7b6d66305876db242593a7fc328d60cce1229bad))
* update downstream workflow trigger from release CD to profile CD ([a50b7e1](https://github.com/infitx-org/onboard/commit/a50b7e18bba7d329816610b9743d5c318bfc3b30))

## [2.0.2](https://github.com/infitx-org/onboard/compare/v2.0.1...v2.0.2) (2025-04-25)


### Bug Fixes

* keep the process alive ([0ed9648](https://github.com/infitx-org/onboard/commit/0ed9648f5e5c3d41a9ca6e640cb11709b6034178))

## [2.0.1](https://github.com/infitx-org/onboard/compare/v2.0.0...v2.0.1) (2025-04-25)


### Bug Fixes

* remove username field from keycloak configuration ([9918af2](https://github.com/infitx-org/onboard/commit/9918af2d7cdb9de04745dc372644d858d7fbd99c))

## [2.0.0](https://github.com/infitx-org/onboard/compare/v1.2.1...v2.0.0) (2025-04-25)


### ⚠ BREAKING CHANGES

* converge in a single process

### Features

* converge in a single process ([ca910fd](https://github.com/infitx-org/onboard/commit/ca910fdc94b0e8f1a20e3f051e5c48c8af27ae42))

## [1.2.1](https://github.com/infitx-org/onboard/compare/v1.2.0...v1.2.1) (2025-04-24)


### Bug Fixes

* extend wait time in onboard loop to 5 minutes ([2f2a50e](https://github.com/infitx-org/onboard/commit/2f2a50e9a9fc567f51860f65841f22ddfe98126b))

## [1.2.0](https://github.com/infitx-org/onboard/compare/v1.1.10...v1.2.0) (2025-04-24)


### Features

* add secrets management and onboarding functionality ([7424da1](https://github.com/infitx-org/onboard/commit/7424da11d462213935129c41e10a1782aa41c56a))


### Bug Fixes

* adjust DFSP onboarding logic to use environment-specific configuration ([3c6b615](https://github.com/infitx-org/onboard/commit/3c6b6151b4df6c3c7151ffb2c0e46f61bb6a8709))

## [1.1.10](https://github.com/infitx-org/onboard/compare/v1.1.9...v1.1.10) (2025-04-23)


### Bug Fixes

* replace slashes in secret keys for consistent formatting ([4fde7fc](https://github.com/infitx-org/onboard/commit/4fde7fc75afdb5b33f0ff17a4ee1e6bf2babb76f))

## [1.1.9](https://github.com/infitx-org/onboard/compare/v1.1.8...v1.1.9) (2025-04-23)


### Bug Fixes

* correct secret key mapping in push data creation ([3c8f7ea](https://github.com/infitx-org/onboard/commit/3c8f7eafd52385b3c1d5b867e6cdec1cde248c61))
* correct secret key mapping in push data creation ([7e9ba49](https://github.com/infitx-org/onboard/commit/7e9ba4902cc084e602e549ef6eaf8968aad7cccd))

## [1.1.8](https://github.com/infitx-org/onboard/compare/v1.1.7...v1.1.8) (2025-04-23)


### Bug Fixes

* ensure grantType is included in keycloak configuration ([847f906](https://github.com/infitx-org/onboard/commit/847f906753d703bec70ad36c587ae93833d5ca1e))

## [1.1.7](https://github.com/infitx-org/onboard/compare/v1.1.6...v1.1.7) (2025-04-23)


### Bug Fixes

* import https module for handling secure requests ([f69a8bf](https://github.com/infitx-org/onboard/commit/f69a8bf31d6be3f34955e146aebdb87c68aa772f))

## [1.1.6](https://github.com/infitx-org/onboard/compare/v1.1.5...v1.1.6) (2025-04-23)


### Bug Fixes

* support both HTTP and HTTPS requests in getSecrets function ([01747ec](https://github.com/infitx-org/onboard/commit/01747ec30d5db53ce37601fe71389a3d4043d65f))

## [1.1.5](https://github.com/infitx-org/onboard/compare/v1.1.4...v1.1.5) (2025-04-23)


### Bug Fixes

* remove branch trigger for Docker publish workflow ([8acb8f9](https://github.com/infitx-org/onboard/commit/8acb8f921e386d2f385b2bc4390e47b6a0ef7f57))

## [1.1.4](https://github.com/infitx-org/onboard/compare/v1.1.3...v1.1.4) (2025-04-23)


### Bug Fixes

* handle case when no secrets are configured for the environment ([f66c2ed](https://github.com/infitx-org/onboard/commit/f66c2ed21dc38cf213faea204011204a0b835358))

## [1.1.3](https://github.com/infitx-org/onboard/compare/v1.1.2...v1.1.3) (2025-04-23)


### Bug Fixes

* update Dockerfile to copy all JavaScript files ([a3abade](https://github.com/infitx-org/onboard/commit/a3abade5085669d466b3de222e5b27c33a24ce3e))

## [1.1.2](https://github.com/infitx-org/onboard/compare/v1.1.1...v1.1.2) (2025-04-23)


### Bug Fixes

* add health check ([6240f2f](https://github.com/infitx-org/onboard/commit/6240f2f1a28ad4b3934db51b7dd519be7ba4bbfe))

## [1.1.1](https://github.com/infitx-org/onboard/compare/v1.1.0...v1.1.1) (2025-04-22)


### Bug Fixes

* remove hardcoded secrets and enforce HTTP auth in configuration ([9e60f2c](https://github.com/infitx-org/onboard/commit/9e60f2c60c43599fe15d5e0313d3330be25b30b8))

## [1.1.0](https://github.com/infitx-org/onboard/compare/v1.0.0...v1.1.0) (2025-04-22)


### Features

* add configuration and secret management for onboard service ([aa7f842](https://github.com/infitx-org/onboard/commit/aa7f842fd0870fc70dd8aa823117b91c3dfa53e0))

## 1.0.0 (2025-04-21)


### Features

* implement push secrets ([4e30992](https://github.com/infitx-org/onboard/commit/4e309926572e3928b6c5c8dd4d3437fb1424c5eb))
