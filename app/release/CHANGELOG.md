# Changelog

## [1.47.1](https://github.com/infitx-org/release-cd/compare/release-v1.47.0...release-v1.47.1) (2026-02-20)


### Bug Fixes

* change shutdown command to stop for VM reboot process ([e694e2c](https://github.com/infitx-org/release-cd/commit/e694e2c1782c099aa3c51df38b1349d43f89fea3))
* update allure dependency to version 3.2.0 in decision, match, and rest-fs packages ([b85e14d](https://github.com/infitx-org/release-cd/commit/b85e14db1701c07071f15bd0ed31bdaf7a510d04))

## [1.47.0](https://github.com/infitx-org/release-cd/compare/release-v1.46.2...release-v1.47.0) (2026-02-18)


### Features

* add reboot and UI triggering ([4e47ff1](https://github.com/infitx-org/release-cd/commit/4e47ff1e074a81fb3b985fe465881c162e91d210))

## [1.46.2](https://github.com/infitx-org/release-cd/compare/release-v1.46.1...release-v1.46.2) (2026-02-10)


### Bug Fixes

* update lastModified handling in notify and notifyRelease functions ([edac743](https://github.com/infitx-org/release-cd/commit/edac74387b1fa745c6cb641875a4aafc314c7329))

## [1.46.1](https://github.com/infitx-org/release-cd/compare/release-v1.46.0...release-v1.46.1) (2026-02-10)


### Bug Fixes

* update notify and trigger functions to handle lastModified and running states ([8407731](https://github.com/infitx-org/release-cd/commit/8407731fdf799e07fb094e0547fb4688c82b96b8))

## [1.46.0](https://github.com/infitx-org/release-cd/compare/release-v1.45.2...release-v1.46.0) (2026-02-09)


### Features

* improve status page to fit on screen ([677b1e1](https://github.com/infitx-org/release-cd/commit/677b1e11f2a1b9839c55fc444c7666b83bf11706))

## [1.45.2](https://github.com/infitx-org/release-cd/compare/release-v1.45.1...release-v1.45.2) (2026-02-05)


### Bug Fixes

* **iad-420:** fixed headers validation tests ([e2c7e38](https://github.com/infitx-org/release-cd/commit/e2c7e38400ec88f0dcf35f2e15abdbdd0622117c))

## [1.45.1](https://github.com/infitx-org/release-cd/compare/release-v1.45.0...release-v1.45.1) (2026-02-04)


### Bug Fixes

* update access checks for MCM-ext DFSP endpoints and correct response codes ([519692e](https://github.com/infitx-org/release-cd/commit/519692efd1597d83684c9f1ebd5af695bc6b5b43))
* update Node.js version to 24.13.0 in Dockerfile ([b6c6148](https://github.com/infitx-org/release-cd/commit/b6c614803af614823aac4d119241935d80a0b280))

## [1.45.0](https://github.com/infitx-org/release-cd/compare/release-v1.44.0...release-v1.45.0) (2026-01-30)


### Features

* enhance pingDFSP function with improved error handling and retry logic; add 'ping' action to trigger function ([5783727](https://github.com/infitx-org/release-cd/commit/5783727639a7d30cc4910b3d2e0633fd118e6163))

## [1.44.0](https://github.com/infitx-org/release-cd/compare/release-v1.43.0...release-v1.44.0) (2026-01-29)


### Features

* **iad-420:** added auth to DFSP state route ([662046a](https://github.com/infitx-org/release-cd/commit/662046a879c378244e27b517e5386d4a61a9e085))

## [1.43.0](https://github.com/infitx-org/release-cd/compare/release-v1.42.1...release-v1.43.0) (2026-01-29)


### Features

* **iad-420:** added tests for /quotes endpoint;  added logger ([faab54a](https://github.com/infitx-org/release-cd/commit/faab54a18ba78900be03ff7f13311c1b5ffa1ed9))

## [1.42.1](https://github.com/infitx-org/release-cd/compare/release-v1.42.0...release-v1.42.1) (2026-01-29)


### Bug Fixes

* remove the ping from onboard as it will be triggered after the job completes ([0e108d7](https://github.com/infitx-org/release-cd/commit/0e108d72033fa393fafe1a4713b79da5e072900e))

## [1.42.0](https://github.com/infitx-org/release-cd/compare/release-v1.41.6...release-v1.42.0) (2026-01-29)


### Features

* more tests ([630bc7a](https://github.com/infitx-org/release-cd/commit/630bc7a6ed11cc917653325adbcce7f70c51ae60))

## [1.41.6](https://github.com/infitx-org/release-cd/compare/release-v1.41.5...release-v1.41.6) (2026-01-29)


### Bug Fixes

* assertions ([#112](https://github.com/infitx-org/release-cd/issues/112)) ([766ba53](https://github.com/infitx-org/release-cd/commit/766ba53f9a371a3f9e3046c844b6a78d450a9598))

## [1.41.5](https://github.com/infitx-org/release-cd/compare/release-v1.41.4...release-v1.41.5) (2026-01-28)


### Bug Fixes

* **csi-2030:** refactored steps to use .mjs ([#108](https://github.com/infitx-org/release-cd/issues/108)) ([a4f284f](https://github.com/infitx-org/release-cd/commit/a4f284f7e822405ed314830e15e49423bcf5d9ca))

## [1.41.4](https://github.com/infitx-org/release-cd/compare/release-v1.41.3...release-v1.41.4) (2026-01-28)


### Bug Fixes

* **csi-2030:** refactored steps to use .mjs ([a1f1539](https://github.com/infitx-org/release-cd/commit/a1f15399644e93a7d8105bed5eeb62586c75cfdd))

## [1.41.3](https://github.com/infitx-org/release-cd/compare/release-v1.41.2...release-v1.41.3) (2026-01-28)


### Bug Fixes

* simplify CSR state check and update onboard job deletion logic ([5d9b402](https://github.com/infitx-org/release-cd/commit/5d9b402d4c248da8b2327874cb39c91dcd91aa81))
* tests ([df60ae1](https://github.com/infitx-org/release-cd/commit/df60ae1cd396bb10b85da499ce39f45180e5e0c5))

## [1.41.2](https://github.com/infitx-org/release-cd/compare/release-v1.41.1...release-v1.41.2) (2026-01-28)


### Bug Fixes

* **csi-2030:** added allure-js-commons package ([a5189b1](https://github.com/infitx-org/release-cd/commit/a5189b1616b5f7c03721bc0ac923d4bb45d6cd20))

## [1.41.1](https://github.com/infitx-org/release-cd/compare/release-v1.41.0...release-v1.41.1) (2026-01-28)


### Bug Fixes

* **csi-2030:** updated getDfspState to use service call instead of kubectl ([1facec4](https://github.com/infitx-org/release-cd/commit/1facec467ca3ac852e9d5c583bd49ca0e1d8ce3f))

## [1.41.0](https://github.com/infitx-org/release-cd/compare/release-v1.40.1...release-v1.41.0) (2026-01-28)


### Features

* **csi-2030:** added normalizeTls ([97357ea](https://github.com/infitx-org/release-cd/commit/97357eaece1f5c317e2fd72c7c0d75324d198715))
* **csi-2030:** added normalizeTls ([6efb1d0](https://github.com/infitx-org/release-cd/commit/6efb1d08f9df54647eb958cf60618b161b2773ce))
* **csi-2030:** added support on release-cd server to get dfsp state ([5cf56bb](https://github.com/infitx-org/release-cd/commit/5cf56bbecfe0214a27d248801e43c7648ac831d8))
* **csi-2030:** added support on release-cd server to get dfsp state ([87a4ae4](https://github.com/infitx-org/release-cd/commit/87a4ae42d9eefb4f3af57b4cd24487ed0cd1f6b3))
* **csi-2030:** added support on release-cd server to get dfsp state ([4340c59](https://github.com/infitx-org/release-cd/commit/4340c59291a0197e8b19cf55f36e13655f9efe00))
* **csi-2030:** fixed execKubectl approach ([ec3922b](https://github.com/infitx-org/release-cd/commit/ec3922b4b47a78835a7af40b2fb6181323854f20))

## [1.40.1](https://github.com/infitx-org/release-cd/compare/release-v1.40.0...release-v1.40.1) (2026-01-27)


### Bug Fixes

* onboard error handling ([acd0cb6](https://github.com/infitx-org/release-cd/commit/acd0cb644bf29a69971ac62d9c180f949f460247))

## [1.40.0](https://github.com/infitx-org/release-cd/compare/release-v1.39.2...release-v1.40.0) (2026-01-27)


### Features

* **csi-2030:** implemented rest headers-validation scenarios ([#101](https://github.com/infitx-org/release-cd/issues/101)) ([53cc262](https://github.com/infitx-org/release-cd/commit/53cc2629deebc4451c28f8313c2d2f39e779a4cb))


### Bug Fixes

* enhance logging for offboarding and key rotation processes ([8af30f1](https://github.com/infitx-org/release-cd/commit/8af30f18a30542ba08bda25c77ea95c1a2d8084a))
* prepend timestamps to error messages for better debugging context ([0af96c9](https://github.com/infitx-org/release-cd/commit/0af96c9501d50bfe4269aefef3b787436518fd26))
* remove timestamp from HTTP request error logging for clarity ([f88169f](https://github.com/infitx-org/release-cd/commit/f88169fc9ef78d8b5466ac70828ea618ca7c990d))

## [1.39.2](https://github.com/infitx-org/release-cd/compare/release-v1.39.1...release-v1.39.2) (2026-01-27)


### Bug Fixes

* enhance participant deletion process and update offboard handler to use timeout query parameter ([37f88e9](https://github.com/infitx-org/release-cd/commit/37f88e98b2275bd3997b7bc5efd5844b1bf7ce56))

## [1.39.1](https://github.com/infitx-org/release-cd/compare/release-v1.39.0...release-v1.39.1) (2026-01-27)


### Bug Fixes

* add k8s API integration for retrieving database passwords in offboard function ([6f8a99f](https://github.com/infitx-org/release-cd/commit/6f8a99f61e088e5ef1f1fea73c015fb5f01f1e2e))

## [1.39.0](https://github.com/infitx-org/release-cd/compare/release-v1.38.0...release-v1.39.0) (2026-01-26)


### Features

* enhance file and directory metadata handling with symlink resolution ([e35ab09](https://github.com/infitx-org/release-cd/commit/e35ab09448562696980b2a85b6d9b02d85b819c7))


### Bug Fixes

* extend action validation in trigger function to include 'offboard' and 'reonboard' ([09b6e71](https://github.com/infitx-org/release-cd/commit/09b6e712165b4bed19cf3a4c6bc341d7e7f5c082))

## [1.38.0](https://github.com/infitx-org/release-cd/compare/release-v1.37.0...release-v1.38.0) (2026-01-26)


### Features

* enhance report handling with S3 configuration updates ([7fb02d7](https://github.com/infitx-org/release-cd/commit/7fb02d741969847b71f1747032615912ffbd6c31))

## [1.37.0](https://github.com/infitx-org/release-cd/compare/release-v1.36.0...release-v1.37.0) (2026-01-26)


### Features

* **csi-2030:** added new headers-validation feature and tests ([#95](https://github.com/infitx-org/release-cd/issues/95)) ([32ec863](https://github.com/infitx-org/release-cd/commit/32ec8630b86df8361e979de4b341ef2a539f779b))


### Bug Fixes

* copy inline reports to s3 ([81db5bf](https://github.com/infitx-org/release-cd/commit/81db5bf27d51a089a1e5eb8402d900f9b813230e))

## [1.36.0](https://github.com/infitx-org/release-cd/compare/release-v1.35.0...release-v1.36.0) (2026-01-26)


### Features

* enhance onboarding and offboarding processes with notification improvements ([16d016c](https://github.com/infitx-org/release-cd/commit/16d016c38ae4ab4028473ed9dca5c2c268f19018))
* proxy key rotation ([f6b9e7b](https://github.com/infitx-org/release-cd/commit/f6b9e7b78f7e53c0b065d416e72ad5f8c298eef1))

## [1.35.0](https://github.com/infitx-org/release-cd/compare/release-v1.34.0...release-v1.35.0) (2026-01-25)


### Features

* add REST filesystem plugin for Hapi with CRUD operations ([ef795b6](https://github.com/infitx-org/release-cd/commit/ef795b6db52614893a8c5bbdf20e427e80beb48e))

## [1.34.0](https://github.com/infitx-org/release-cd/compare/release-v1.33.0...release-v1.34.0) (2026-01-23)


### Features

* implement offboard handler ([97fcf00](https://github.com/infitx-org/release-cd/commit/97fcf00c441023e877e86a46035cb5fa36448eae))

## [1.33.0](https://github.com/infitx-org/release-cd/compare/release-v1.32.0...release-v1.33.0) (2026-01-23)


### Features

* enhance onboarding and ping functionality with logging and notification support ([d0526a5](https://github.com/infitx-org/release-cd/commit/d0526a5d8e6f69a2a20a0c37f8dcbd16f20074aa))
* enhance onboarding and ping functionality with timeout support ([40a9923](https://github.com/infitx-org/release-cd/commit/40a9923711072fe0d3856f052c26b64ca810377c))
* onboard handler ([5122688](https://github.com/infitx-org/release-cd/commit/51226888a95130bc05422217e8bc3fb650c5464f))
* ping handler ([81ac10e](https://github.com/infitx-org/release-cd/commit/81ac10e0bfcd98c1c06386dad950d7a6bd0283c2))


### Bug Fixes

* await server registration for basic auth ([2e5e98a](https://github.com/infitx-org/release-cd/commit/2e5e98a4cca86bb9d1a7123828c8898bfe9d79a1))

## [1.32.0](https://github.com/infitx-org/release-cd/compare/release-v1.31.3...release-v1.32.0) (2026-01-21)


### Features

* implement report endpoint ([c75b49b](https://github.com/infitx-org/release-cd/commit/c75b49b69557143198bf2cd12285c4bbf394dd59))

## [1.31.3](https://github.com/infitx-org/release-cd/compare/release-v1.31.2...release-v1.31.3) (2026-01-14)


### Bug Fixes

* update request handling in keyRotateDFSP and trigger functions ([9dbc886](https://github.com/infitx-org/release-cd/commit/9dbc88610ea87787162cc4e097c61b3366730a50))
* update request property from body to payload in keyRotateDFSP and triggerJob handlers ([7105cdc](https://github.com/infitx-org/release-cd/commit/7105cdc211dbf5149bda74c473434e3b461f9065))

## [1.31.2](https://github.com/infitx-org/release-cd/compare/release-v1.31.1...release-v1.31.2) (2026-01-14)


### Bug Fixes

* add missing import ([cfdb53b](https://github.com/infitx-org/release-cd/commit/cfdb53b0cf72b9d428a4a3e7c7f00284f17ef33f))

## [1.31.1](https://github.com/infitx-org/release-cd/compare/release-v1.31.0...release-v1.31.1) (2026-01-14)


### Bug Fixes

* notify ([8781e1d](https://github.com/infitx-org/release-cd/commit/8781e1d2dfa751ed71cf540e7b2b78fed1fbd0e8))

## [1.31.0](https://github.com/infitx-org/release-cd/compare/release-v1.30.1...release-v1.31.0) (2026-01-14)


### Features

* add dfsp jws rotate ([4d76ece](https://github.com/infitx-org/release-cd/commit/4d76ece4d7edc7adb65e641b48ea431be552ff03))
* add dfsp jws rotate ([507842c](https://github.com/infitx-org/release-cd/commit/507842c4088b12a2c6644be4ee1c8a33c0e67dcc))
* validation ([14c0b5e](https://github.com/infitx-org/release-cd/commit/14c0b5ed38be2a98376c23807acb44f8612a48d2))


### Bug Fixes

* import ([8ff7ce8](https://github.com/infitx-org/release-cd/commit/8ff7ce8cee3905360cb435fd942ff9492f71fcb6))
* pm4mls in args ([9a68c16](https://github.com/infitx-org/release-cd/commit/9a68c16a6667c43265235b65e7121e7acf3ac514))

## [1.30.1](https://github.com/infitx-org/release-cd/compare/release-v1.30.0...release-v1.30.1) (2026-01-10)


### Bug Fixes

* improve action claiming logic in trigger function ([4f9be0b](https://github.com/infitx-org/release-cd/commit/4f9be0bd9b5a3f3deaf6134d755868b51343d3a5))

## [1.30.0](https://github.com/infitx-org/release-cd/compare/release-v1.29.5...release-v1.30.0) (2026-01-09)


### Features

* rotate TLS server cert ([fb32710](https://github.com/infitx-org/release-cd/commit/fb32710028a99081e6a408b8a8c707104ab8d9f4))


### Bug Fixes

* handle SIGINT and SIGTERM signals for graceful shutdown ([580a46d](https://github.com/infitx-org/release-cd/commit/580a46de60fdb8d3c3bdf61dc54fa8f3423a5586))

## [1.29.5](https://github.com/infitx-org/release-cd/compare/release-v1.29.4...release-v1.29.5) (2026-01-08)


### Bug Fixes

* import statSync for file size retrieval ([30209d4](https://github.com/infitx-org/release-cd/commit/30209d4f53ab1509b4daa6bb7b9d062661dbc223))

## [1.29.4](https://github.com/infitx-org/release-cd/compare/release-v1.29.3...release-v1.29.4) (2026-01-08)


### Bug Fixes

* mask response body logging for specific paths ([ce54952](https://github.com/infitx-org/release-cd/commit/ce54952ee037192e52d5e5da259a4b4dc9d89a97))

## [1.29.3](https://github.com/infitx-org/release-cd/compare/release-v1.29.2...release-v1.29.3) (2026-01-07)


### Bug Fixes

* resolve before aborting ([c7de2c0](https://github.com/infitx-org/release-cd/commit/c7de2c02d754fa5590b67a680f174b2a15bd64d9))

## [1.29.2](https://github.com/infitx-org/release-cd/compare/release-v1.29.1...release-v1.29.2) (2026-01-07)


### Bug Fixes

* update notifyRelease function to fetch URL from a config map ([e393a25](https://github.com/infitx-org/release-cd/commit/e393a259859b120dba194714c884f2eacb46a5f6))

## [1.29.1](https://github.com/infitx-org/release-cd/compare/release-v1.29.0...release-v1.29.1) (2026-01-06)


### Bug Fixes

* improve key rotation logic and error handling ([4a8a1e6](https://github.com/infitx-org/release-cd/commit/4a8a1e62a19f427e0282cc65c891c38cb4771914))

## [1.29.0](https://github.com/infitx-org/release-cd/compare/release-v1.28.0...release-v1.29.0) (2026-01-06)


### Features

* enhance authentication handling ([96526c3](https://github.com/infitx-org/release-cd/commit/96526c3a0c03101ea1e3474b0d7e6c2e0a149c13))

## [1.28.0](https://github.com/infitx-org/release-cd/compare/release-v1.27.0...release-v1.28.0) (2026-01-06)


### Features

* implement triggering of jobs and key rotation ([4383cd9](https://github.com/infitx-org/release-cd/commit/4383cd907cce34baf5d79a24f74d314d2a6f314a))

## [1.27.0](https://github.com/infitx-org/release-cd/compare/release-v1.26.0...release-v1.27.0) (2026-01-02)


### Features

* add app health endpoint ([704b068](https://github.com/infitx-org/release-cd/commit/704b06821711d838c4eec734f2955072752feb3c))
* add reonboard handler ([6b4e1b9](https://github.com/infitx-org/release-cd/commit/6b4e1b92821791819b3e795833b6bcd96f03326b))

## [1.26.0](https://github.com/infitx-org/release-cd/compare/release-v1.25.0...release-v1.26.0) (2026-01-02)


### Features

* implement reonboard handler and add decision logic for key rotation ([d6ebc14](https://github.com/infitx-org/release-cd/commit/d6ebc14b062f3837431252ba9807631692860bb7))

## [1.25.0](https://github.com/infitx-org/release-cd/compare/release-v1.24.0...release-v1.25.0) (2025-12-30)


### Features

* update build and release workflows to simplify branch specification and add yaml dependency ([9732da3](https://github.com/infitx-org/release-cd/commit/9732da3d3b7be660bd10fe68be574ee3efe2e1ca))

## [1.24.0](https://github.com/infitx-org/release-cd/compare/release-v1.23.0...release-v1.24.0) (2025-12-30)


### Features

* add @hapi/inert dependency to package.json and update pnpm-lock.yaml ([f3c9a8e](https://github.com/infitx-org/release-cd/commit/f3c9a8ef8a3577360bc11b9a553be971a5db6ad0))

## [1.23.0](https://github.com/infitx-org/release-cd/compare/release-v1.22.1...release-v1.23.0) (2025-12-30)


### Features

* add ky dependency to package.json and update pnpm-lock.yaml ([9e0fa7f](https://github.com/infitx-org/release-cd/commit/9e0fa7fca185152003fb6f73f24fe64aa4ad83bd))

## [1.22.1](https://github.com/infitx-org/release-cd/compare/release-v1.22.0...release-v1.22.1) (2025-12-30)


### Bug Fixes

* update dependencies ([79f0b0f](https://github.com/infitx-org/release-cd/commit/79f0b0f6c14a09b8393e79e0d409dc5be170d833))

## [1.22.0](https://github.com/infitx-org/release-cd/compare/release-v1.21.4...release-v1.22.0) (2025-12-30)


### Features

* add notify handler and route for sending notifications ([fe91f52](https://github.com/infitx-org/release-cd/commit/fe91f521f389c76e6734b89f2d15d2cf11d13ed2))

## [1.21.4](https://github.com/infitx-org/release-cd/compare/release-v1.21.3...release-v1.21.4) (2025-12-30)


### Bug Fixes

* update database reference from request.app.db to request.server.app.db ([7ddf394](https://github.com/infitx-org/release-cd/commit/7ddf3942283a143c30908e45471b67ab0a4605ee))

## [1.21.3](https://github.com/infitx-org/release-cd/compare/release-v1.21.2...release-v1.21.3) (2025-12-29)


### Bug Fixes

* update database reference from request.app.db to request.server.app.db ([e84f2e5](https://github.com/infitx-org/release-cd/commit/e84f2e5e4120fdc2444e3902d2184bb057360f78))

## [1.21.2](https://github.com/infitx-org/release-cd/compare/release-v1.21.1...release-v1.21.2) (2025-12-29)


### Bug Fixes

* import paths ([ca7bbdf](https://github.com/infitx-org/release-cd/commit/ca7bbdf5e40f10dfe015ac6890e8a23b871319c4))
* specify package for rush deploy in Dockerfiles ([b4b662d](https://github.com/infitx-org/release-cd/commit/b4b662d0dc4055681f577b590bf61decf50d6137))

## [1.21.1](https://github.com/infitx-org/release-cd/compare/release-v1.21.0...release-v1.21.1) (2025-12-29)


### Bug Fixes

* move scripts ([3f512cb](https://github.com/infitx-org/release-cd/commit/3f512cbf41a292d92fe93d9b0cd402254c924766))

## [1.21.0](https://github.com/infitx-org/release-cd/compare/release-v1.20.0...release-v1.21.0) (2025-12-26)


### Features

* implement key rotation triggering ([375803d](https://github.com/infitx-org/release-cd/commit/375803d019017eac51fab0ca5493037c4bada4b0))


### Bug Fixes

* lint ([01c069d](https://github.com/infitx-org/release-cd/commit/01c069d1489d72e4a5e5a3fe8f19f01727735ee7))
* make CD handler optional ([41ae89f](https://github.com/infitx-org/release-cd/commit/41ae89fae1f2723924dc6949a63ce037365846db))

## [1.20.0](https://github.com/infitx-org/release-cd/compare/release-v1.19.0...release-v1.20.0) (2025-12-23)


### Features

* match and decision libraries ([db62341](https://github.com/infitx-org/release-cd/commit/db623419a179b3e0ec0cbda05b2f135e01375552))


### Bug Fixes

* correct release tag pattern in Docker workflow and update package version to 1.19.0 ([d8bcee2](https://github.com/infitx-org/release-cd/commit/d8bcee2086cd532e7a0af8f2c1357777022863fa))
* remove unnecessary --link option from COPY command in Dockerfile ([42159cd](https://github.com/infitx-org/release-cd/commit/42159cd3d81ca0d12fe6db11d723f786caf8b2ff))
* update Dockerfile to include library package.json in build context ([7031dd3](https://github.com/infitx-org/release-cd/commit/7031dd33e9fbf3d07dc8170c78b038f24677890b))

## [1.18.0](https://github.com/infitx-org/release-cd/compare/release-v1.17.2...release-v1.18.0) (2025-12-23)


### Features

* match and decision libraries ([db62341](https://github.com/infitx-org/release-cd/commit/db623419a179b3e0ec0cbda05b2f135e01375552))


### Bug Fixes

* remove unnecessary --link option from COPY command in Dockerfile ([42159cd](https://github.com/infitx-org/release-cd/commit/42159cd3d81ca0d12fe6db11d723f786caf8b2ff))
* update Dockerfile to include library package.json in build context ([7031dd3](https://github.com/infitx-org/release-cd/commit/7031dd33e9fbf3d07dc8170c78b038f24677890b))

## [1.19.0](https://github.com/infitx-org/release-cd/compare/v1.18.3...v1.19.0) (2025-12-19)


### Features

* add key rotation and cron job triggering functionality ([cb368e4](https://github.com/infitx-org/release-cd/commit/cb368e4efc55ee7dbbb8141d4bb80ce10d9c8fd2))
* add vault-cli installation to Dockerfile ([dacd545](https://github.com/infitx-org/release-cd/commit/dacd5453e49ffae0f95bcdc9f02d1907f2296961))


### Bug Fixes

* improve report fetching logic and ensure ContentLength is set correctly ([735d77d](https://github.com/infitx-org/release-cd/commit/735d77d93da7bc54d5e7fa253ec78d7b2b2f645c))
* update kubescape installation script version to v3.0.47 ([d9fca5c](https://github.com/infitx-org/release-cd/commit/d9fca5c0460f9f5ce3a1589d948da367936c1f50))

## [1.18.3](https://github.com/infitx-org/release-cd/compare/v1.18.2...v1.18.3) (2025-12-09)


### Bug Fixes

* correct bucket property access in S3 configuration check ([dc1d17f](https://github.com/infitx-org/release-cd/commit/dc1d17fa2132be2a41be0d729e7b655e4625cfaa))

## [1.18.2](https://github.com/infitx-org/release-cd/compare/v1.18.1...v1.18.2) (2025-12-09)


### Bug Fixes

* update allure and allure-jest dependencies to latest versions ([2608a89](https://github.com/infitx-org/release-cd/commit/2608a8901741ad3f111374b20b707877f1382beb))

## [1.18.1](https://github.com/infitx-org/release-cd/compare/v1.18.0...v1.18.1) (2025-12-09)


### Bug Fixes

* add downstream dispatch URL to Docker workflow and create directory for kubescape artifacts ([4087edc](https://github.com/infitx-org/release-cd/commit/4087edca258388fd2650fa14d5a333ec67eb6867))
* remove unnecessary directory creation and download command for kubescape artifacts ([ccb2e16](https://github.com/infitx-org/release-cd/commit/ccb2e16b25a63c614680ae41c17a007a7d2f3419))
* specify version for kubescape installation in Dockerfile ([e338e43](https://github.com/infitx-org/release-cd/commit/e338e4359e765d88d0a45e1cf5d3b77bf2fe2d1f))
* update kubescape installation command and add artifact download ([321ecf0](https://github.com/infitx-org/release-cd/commit/321ecf00e72273852a876d3d9d571463b1bd1cd8))

## [1.18.0](https://github.com/infitx-org/release-cd/compare/v1.17.2...v1.18.0) (2025-12-09)


### Features

* add .grype.yaml configuration for vulnerability scanning ([29ba7f8](https://github.com/infitx-org/release-cd/commit/29ba7f8c269ca5ede7f340bd76eebc18bae8829c))
* refactor GitHub workflows and make bucket configurable ([26d03de](https://github.com/infitx-org/release-cd/commit/26d03de8e072aed52820a1a6b8afb6c09743eadb))


### Bug Fixes

* add TRIGGER_DOWNSTREAM secret to Docker workflow ([a040050](https://github.com/infitx-org/release-cd/commit/a040050e46a6d4a3683e98b1781d50cf33db004d))
* explicitly disable license scan in Docker workflow ([ee7ec3c](https://github.com/infitx-org/release-cd/commit/ee7ec3c7aeea2b832ea789d8a03642bf01509ce6))
* ignore license scan ([c11b1d4](https://github.com/infitx-org/release-cd/commit/c11b1d4222a6bd536ed198566efaf3a20692fa2b))
* remove unnecessary permissions section from release workflow ([0174de8](https://github.com/infitx-org/release-cd/commit/0174de83fee740d759d9534b265d818b2fb81587))
* update Docker workflow to remove redundant owner field and correct token secret in release workflow ([c95a871](https://github.com/infitx-org/release-cd/commit/c95a871599ce4b58643b33b7135fb091a970b4c8))

## [1.17.2](https://github.com/infitx-org/release-cd/compare/v1.17.1...v1.17.2) (2025-11-27)


### Bug Fixes

* update Helm installation command to remove redundant flags ([42ffa75](https://github.com/infitx-org/release-cd/commit/42ffa75981531d825415694dd7c463b771fd409d))

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
