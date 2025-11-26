# Changelog

## [1.17.1](https://github.com/infitx-org/release-cd/compare/v1.17.0...v1.17.1) (2025-11-26)


### Bug Fixes

* conditionally skip TLS verification for Kubernetes API client ([61b1e9d](https://github.com/infitx-org/release-cd/commit/61b1e9dc9abc3295c0b88ce8d264512fb9fe466d))
* ensure TLS verification is skipped for Kubernetes API client ([49c2127](https://github.com/infitx-org/release-cd/commit/49c212717effb20d2670fefd59fccc604a1fd010))

## [1.17.0](https://github.com/infitx-org/release-cd/compare/v1.16.0...v1.17.0) (2025-11-25)


### Features

* enhance vulnerability report with severity icons and decode artifact IDs ([8cb4fcc](https://github.com/infitx-org/release-cd/commit/8cb4fcc1a50bcca3325ea042daa3edcbe23bf173))

## [1.16.0](https://github.com/infitx-org/release-cd/compare/v1.15.0...v1.16.0) (2025-11-25)


### Features

* improve vulnerability report ([6f83458](https://github.com/infitx-org/release-cd/commit/6f8345845ec20becc5d67ffe34684581e9d7278b))
* process all vulnerability reports instead of limiting to five ([3aa4f32](https://github.com/infitx-org/release-cd/commit/3aa4f32664460c34f1d59740477c50545331bb9b))

## [1.15.0](https://github.com/infitx-org/release-cd/compare/v1.14.7...v1.15.0) (2025-11-24)


### Features

* add vulnerability report script ([14d7651](https://github.com/infitx-org/release-cd/commit/14d7651e5b08e2193964229ca41ccf7176bf123c))

## [1.14.7](https://github.com/infitx-org/release-cd/compare/v1.14.6...v1.14.7) (2025-11-21)


### Bug Fixes

* correct conditional check for message type in notifySlack function ([1c5f3ae](https://github.com/infitx-org/release-cd/commit/1c5f3ae775d20d21c3699a65556a8b59c36ba3cb))
* update report handling to use Readable.fromWeb for stream compatibility ([c19e824](https://github.com/infitx-org/release-cd/commit/c19e824f7c47c1e69c4a517953477c7be1e2e30e))

## [1.14.6](https://github.com/infitx-org/release-cd/compare/v1.14.5...v1.14.6) (2025-11-21)


### Bug Fixes

* update notify function to use summary instead of stats ([b3c000e](https://github.com/infitx-org/release-cd/commit/b3c000e911134b9ca9d21c15bad564a9553f085e))

## [1.14.5](https://github.com/infitx-org/release-cd/compare/v1.14.4...v1.14.5) (2025-11-20)


### Bug Fixes

* pass content type ([ed74369](https://github.com/infitx-org/release-cd/commit/ed74369dc646cb9f0b75f5e7d9dd6332fad78b93))

## [1.14.4](https://github.com/infitx-org/release-cd/compare/v1.14.3...v1.14.4) (2025-11-20)


### Bug Fixes

* update S3 report key generation to include report ID ([bdeb201](https://github.com/infitx-org/release-cd/commit/bdeb20182c2ccbbaadb143d7b9da3e9a3f26cbea))

## [1.14.3](https://github.com/infitx-org/release-cd/compare/v1.14.2...v1.14.3) (2025-11-20)


### Bug Fixes

* simplify allure results directory path resolution ([244a61d](https://github.com/infitx-org/release-cd/commit/244a61d6e19a986254f5982dc73e140bccdb3855))

## [1.14.2](https://github.com/infitx-org/release-cd/compare/v1.14.1...v1.14.2) (2025-11-20)


### Bug Fixes

* kubescape report handling ([ca8136a](https://github.com/infitx-org/release-cd/commit/ca8136aab8aa2364b29f44183e1b4400f7a3d7e0))

## [1.14.1](https://github.com/infitx-org/release-cd/compare/v1.14.0...v1.14.1) (2025-11-20)


### Bug Fixes

* config handling ([a6be1f4](https://github.com/infitx-org/release-cd/commit/a6be1f445e509d232e9debb7ec31162594f3b07f))

## [1.14.0](https://github.com/infitx-org/release-cd/compare/v1.13.1...v1.14.0) (2025-11-20)


### Features

* release notification ([641805c](https://github.com/infitx-org/release-cd/commit/641805cbca19ab8964e2b59401c85f6009274a75))

## [1.13.1](https://github.com/infitx-org/release-cd/compare/v1.13.0...v1.13.1) (2025-11-19)


### Bug Fixes

* normalize control message URLs to lowercase ([378a200](https://github.com/infitx-org/release-cd/commit/378a20041754d6fe81b21a91a6564ceb18fb305a))
* update Kubescape control message URL to point to documentation ([1ec4310](https://github.com/infitx-org/release-cd/commit/1ec4310f046d3e58e2c24b6c7b9c1b654b8b50a5))

## [1.13.0](https://github.com/infitx-org/release-cd/compare/v1.12.0...v1.13.0) (2025-11-19)


### Features

* add kubescape report generation and update Dockerfile ([4f37761](https://github.com/infitx-org/release-cd/commit/4f37761e45b1b94f904651244a9b227f558b6213))

## [1.12.0](https://github.com/infitx-org/release-cd/compare/v1.11.4...v1.12.0) (2025-11-18)


### Features

* add policy report extraction and Allure results generation ([38a58a7](https://github.com/infitx-org/release-cd/commit/38a58a758012560e8dd1d3fef26c367539715760))

## [1.11.4](https://github.com/infitx-org/release-cd/compare/v1.11.3...v1.11.4) (2025-11-18)


### Bug Fixes

* add check for .bashrc and copy skeleton files if missing ([169c478](https://github.com/infitx-org/release-cd/commit/169c478dd9f1986d55ebd0b9be2cae20bf550d82))

## [1.11.3](https://github.com/infitx-org/release-cd/compare/v1.11.2...v1.11.3) (2025-11-17)


### Bug Fixes

* update exposed port from 80 to 8080 in Dockerfile and ttyd script ([bc8a10d](https://github.com/infitx-org/release-cd/commit/bc8a10d8e5ef9d0a8e517b00698cac69cf133ee5))

## [1.11.2](https://github.com/infitx-org/release-cd/compare/v1.11.1...v1.11.2) (2025-11-17)


### Bug Fixes

* show all mismatches ([93384bd](https://github.com/infitx-org/release-cd/commit/93384bd037c3b26be14371295d02b0453a4294ef))

## [1.11.1](https://github.com/infitx-org/release-cd/compare/v1.11.0...v1.11.1) (2025-11-17)


### Bug Fixes

* enhance endpoint access checks to log mismatches and fail tests on errors ([4ccf8ab](https://github.com/infitx-org/release-cd/commit/4ccf8ab69997fea43503d25a5c135016348f85b0))
* update ttyd script to use DEV_USER and DEV_PASS; improve tui.sh argument handling ([7ff0f92](https://github.com/infitx-org/release-cd/commit/7ff0f9211abc1b540f8af1aa8ee9303a1df28479))

## [1.11.0](https://github.com/infitx-org/release-cd/compare/v1.10.2...v1.11.0) (2025-11-16)


### Features

* add vscode-cli installation and create ttyd and tui scripts ([9602e8d](https://github.com/infitx-org/release-cd/commit/9602e8d662e7cd5f261676d6841d8bff0f9deae9))

## [1.10.2](https://github.com/infitx-org/release-cd/compare/v1.10.1...v1.10.2) (2025-11-16)


### Bug Fixes

* correct k6 installation extraction path in Dockerfile ([5ba9b78](https://github.com/infitx-org/release-cd/commit/5ba9b78a3b4a91d3dbc75a14c62d1600d801b4a1))

## [1.10.1](https://github.com/infitx-org/release-cd/compare/v1.10.0...v1.10.1) (2025-11-16)


### Bug Fixes

* update k6 installation to use specific version v1.4.0 ([cdd89b7](https://github.com/infitx-org/release-cd/commit/cdd89b703332b3a15ef635986a6d0b0b64a53a33))

## [1.10.0](https://github.com/infitx-org/release-cd/compare/v1.9.4...v1.10.0) (2025-11-16)


### Features

* add installation of k6 to Dockerfile ([c8da953](https://github.com/infitx-org/release-cd/commit/c8da953b9bea684096592baa1d3895873b815a9c))


### Bug Fixes

* remove unused historyPath from allure configuration ([bf56ad6](https://github.com/infitx-org/release-cd/commit/bf56ad61a79fef94b64e4dcd464d03102228e583))

## [1.9.4](https://github.com/infitx-org/release-cd/compare/v1.9.3...v1.9.4) (2025-11-16)


### Bug Fixes

* ensure proper ownership of /opt/app directory in release image ([be152d8](https://github.com/infitx-org/release-cd/commit/be152d86ada4082abd45187e121a93ebc241c11f))

## [1.9.3](https://github.com/infitx-org/release-cd/compare/v1.9.2...v1.9.3) (2025-11-16)


### Bug Fixes

* move user command ([be71a6f](https://github.com/infitx-org/release-cd/commit/be71a6f4d23b91d33935989dd0afecf57a939d21))

## [1.9.2](https://github.com/infitx-org/release-cd/compare/v1.9.1...v1.9.2) (2025-11-16)


### Bug Fixes

* streamline Dockerfile by consolidating COPY commands in release stage ([638532a](https://github.com/infitx-org/release-cd/commit/638532a568dc91373e3cc315a91d75aef0f75cbf))

## [1.9.1](https://github.com/infitx-org/release-cd/compare/v1.9.0...v1.9.1) (2025-11-16)


### Bug Fixes

* copy package.json files in release stage of Dockerfile ([d2c0a91](https://github.com/infitx-org/release-cd/commit/d2c0a91e41d4066640bad43a9f053bb2b704d36c))

## [1.9.0](https://github.com/infitx-org/release-cd/compare/v1.8.2...v1.9.0) (2025-11-16)


### Features

* enhance Dockerfile with additional tools and create kube-config script ([729b725](https://github.com/infitx-org/release-cd/commit/729b7259fa37dd46636be78e7e82783b2cfd9636))

## [1.8.2](https://github.com/infitx-org/release-cd/compare/v1.8.1...v1.8.2) (2025-11-15)


### Bug Fixes

* add historyPath to allure configuration ([22fb1dd](https://github.com/infitx-org/release-cd/commit/22fb1dd2e3cd26932445d7250981ef4116f79aef))

## [1.8.1](https://github.com/infitx-org/release-cd/compare/v1.8.0...v1.8.1) (2025-11-15)


### Bug Fixes

* correct image name reference in Docker publish workflow ([65e33a5](https://github.com/infitx-org/release-cd/commit/65e33a5d1b6746652b26b53ef808176153968972))

## [1.8.0](https://github.com/infitx-org/release-cd/compare/v1.7.3...v1.8.0) (2025-11-15)


### Features

* add allure reporting to test script and include allure dependency ([e2595ca](https://github.com/infitx-org/release-cd/commit/e2595cad126bded94e425cc9557c1f69baec1c86))
* implement configuration management and reporting features with S3 and Slack integration ([66b637b](https://github.com/infitx-org/release-cd/commit/66b637bb39af547cfdedd04cde290f447d8da782))


### Bug Fixes

* update test script to include notification step ([0f4cf50](https://github.com/infitx-org/release-cd/commit/0f4cf50bd4c2c28c6b9894bbb98a938d9a5f2cd2))

## [1.7.3](https://github.com/infitx-org/release-cd/compare/v1.7.2...v1.7.3) (2025-11-15)


### Bug Fixes

* update test environment to allure-jest and add allure-jest dependency ([59e273e](https://github.com/infitx-org/release-cd/commit/59e273e935dcdce475a7f0fa89d9dcf579d3fbd3))

## [1.7.2](https://github.com/infitx-org/release-cd/compare/v1.7.1...v1.7.2) (2025-11-14)


### Bug Fixes

* improve endpoint access checks and formatting in tests ([c82b9a0](https://github.com/infitx-org/release-cd/commit/c82b9a01b4a85038524e3d9f90dda7281f545288))

## [1.7.1](https://github.com/infitx-org/release-cd/compare/v1.7.0...v1.7.1) (2025-11-13)


### Bug Fixes

* enable color output for jest test script ([42d207e](https://github.com/infitx-org/release-cd/commit/42d207eed8a204efd6f52e5a4d91834f2a422210))

## [1.7.0](https://github.com/infitx-org/release-cd/compare/v1.6.0...v1.7.0) (2025-11-12)


### Features

* add oidc flow ([fef6d0d](https://github.com/infitx-org/release-cd/commit/fef6d0d3345c01143593eef4b66b817d93463149))

## [1.6.0](https://github.com/infitx-org/release-cd/compare/v1.5.2...v1.6.0) (2025-11-10)


### Features

* add all mcm endpoints ([c5a07f5](https://github.com/infitx-org/release-cd/commit/c5a07f581abd41067e38d205d580f1e99c041c14))

## [1.5.2](https://github.com/infitx-org/release-cd/compare/v1.5.1...v1.5.2) (2025-11-07)


### Bug Fixes

* remove unused parameter from response validation in portal tests ([1d8819a](https://github.com/infitx-org/release-cd/commit/1d8819aa84689c19a1e233bb570e15abb8b62a0e))

## [1.5.1](https://github.com/infitx-org/release-cd/compare/v1.5.0...v1.5.1) (2025-11-07)


### Bug Fixes

* simplify response expectation in portal tests ([c84895a](https://github.com/infitx-org/release-cd/commit/c84895aa2b04bbf0b4e6b72b787bf7ef6f608ca6))
* update Dockerfile to copy all JavaScript and feature files ([08c407c](https://github.com/infitx-org/release-cd/commit/08c407c235743e52474a81193f7336dcf42406c0))

## [1.5.0](https://github.com/infitx-org/release-cd/compare/v1.4.0...v1.5.0) (2025-11-07)


### Features

* add portal testing ([26b2b99](https://github.com/infitx-org/release-cd/commit/26b2b999dec124791529a95434f1dfe560d4c862))


### Bug Fixes

* handle potential undefined submodules in mismatch list ([f43b7eb](https://github.com/infitx-org/release-cd/commit/f43b7eb53263a311c5fdf7df50b2e0d0d2b440c0))

## [1.4.0](https://github.com/infitx-org/release-cd/compare/v1.3.2...v1.4.0) (2025-10-29)


### Features

* enhance release CD status report with HTML formatting and detailed test results ([0b1158f](https://github.com/infitx-org/release-cd/commit/0b1158f9253a9f8eba195f602bc1cce4744533cb))

## [1.3.2](https://github.com/infitx-org/release-cd/compare/v1.3.1...v1.3.2) (2025-10-29)


### Bug Fixes

* handle optional tests and improve submodule mismatch reporting ([9a1cea4](https://github.com/infitx-org/release-cd/commit/9a1cea4fccd5c4aeb3d7a3906db96cfa31f5f534))

## [1.3.1](https://github.com/infitx-org/release-cd/compare/v1.3.0...v1.3.1) (2025-10-29)


### Bug Fixes

* update status messages for test and submodule checks ([557895f](https://github.com/infitx-org/release-cd/commit/557895fee0a296b6c77204ae72500a45b9fe56d9))

## [1.3.0](https://github.com/infitx-org/release-cd/compare/v1.2.1...v1.3.0) (2025-10-29)


### Features

* add optional tests validation and new endpoint for CD revision checks ([ff7b394](https://github.com/infitx-org/release-cd/commit/ff7b394daaedb67b574a093aae566e57d6f2c56d))

## [1.2.1](https://github.com/infitx-org/release-cd/compare/v1.2.0...v1.2.1) (2025-10-10)


### Bug Fixes

* improve error handling for S3 report fetching ([6a0d79d](https://github.com/infitx-org/release-cd/commit/6a0d79d5dab602d8d96c507ed46cbb2e3a55ddf5))

## [1.2.0](https://github.com/infitx-org/release-cd/compare/v1.1.2...v1.2.0) (2025-10-08)


### Features

* release reports ([0f5d177](https://github.com/infitx-org/release-cd/commit/0f5d177cbbec0c42600e06d0b9114b062d5c1729))

## [1.1.2](https://github.com/infitx-org/release-cd/compare/v1.1.1...v1.1.2) (2025-06-18)


### Bug Fixes

* remove obsolete instruction ([12b951a](https://github.com/infitx-org/release-cd/commit/12b951a5a3cee20f6306757eebb9461297397698))

## [1.1.1](https://github.com/infitx-org/release-cd/compare/v1.1.0...v1.1.1) (2025-05-26)


### Bug Fixes

* handle iac/ansible tags ([6ff7b93](https://github.com/infitx-org/release-cd/commit/6ff7b939c33e97e313928f2de0a919935122cf56))

## [1.1.0](https://github.com/infitx-org/release-cd/compare/v1.0.18...v1.1.0) (2025-05-26)


### Features

* add downstream workflow trigger for profile CD ([737f13b](https://github.com/infitx-org/release-cd/commit/737f13bc17ae6682725317db73df818e0e3e72cf))
* handle iac/ansible tags ([7ab5a3e](https://github.com/infitx-org/release-cd/commit/7ab5a3eabb8506ccc808d3c57e3259710255eab4))

## [1.0.18](https://github.com/infitx-org/release-cd/compare/v1.0.17...v1.0.18) (2025-04-23)


### Bug Fixes

* add release-please GitHub Actions workflow ([5f1a544](https://github.com/infitx-org/release-cd/commit/5f1a544c8e9a1cc7d57d83075c004cf310c06b4f))
* remove branch trigger for Docker publish workflow ([241564c](https://github.com/infitx-org/release-cd/commit/241564c152a7768255ed8b95cac4e40c2bda78f5))
* update release type in GitHub Actions workflow to node ([b52c921](https://github.com/infitx-org/release-cd/commit/b52c921b28ee3ad270478c02c5510717a88a3ad5))
