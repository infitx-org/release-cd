@headers @validation @oidc
Feature: Validate FSPIOP-Source and FSPIOP-Proxy headers against X-Client-Id

    Background:
        Given hub external API portal endpoints are configured
        And credentials for OIDC (Keycloak) clients for DFSPs provided
            | id      |  flow  |
            | alice   |  oidc  |
            | bob     |  oidc  |
        And each DFSP has valid access token
        And mTLS creds for extapi endpoint are received


    Scenario: Successful validation of FSPIOP source and proxy headers
        When DFSP sends discovery requests with proper access_token and headers:
            | dfsp  | token   | source | proxy | statusCode |
            | alice | alice   | alice  |       | 202        |
            | alice | alice   | bob    | alice | 202        |
            | alice | alice   | xxx    | alice | 202        |
        Then all requests succeed with proper statusCode

    Scenario: Failed validation due to incorrect FSPIOP source and proxy headers
        When DFSP sends discovery requests with valid own access_token and incorrect headers:
            | dfsp  | token   | source | proxy | statusCode |
            | alice | alice   |        |       | 400        |
            | alice | alice   |        | alice | 400        |
            | alice | alice   |        | bob   | 400        |
            | alice | alice   | alice  | alice | 400        |
            | alice | alice   | alice  | bob   | 400        |
            | alice | alice   | bob    |       | 400        |
            | alice | alice   | xxx    |       | 400        |
            | alice | alice   | alice  | xxx   | 400        |
            | alice | alice   | bob    | xxx   | 400        |
        Then all requests fail with proper error statusCode

    Scenario: Failed validation due to missing access token
        When DFSP send discovery requests without access token:
            | dfsp  | token   | source | proxy | statusCode |
            | alice |         |        |       | 401        |
            | alice |         | alice  |       | 401        |
            | alice |         | bob    | alice | 401        |
        Then all requests fail with 401 Unauthorized error

    Scenario: Failed validation due to wrong access token
        When send discovery requests with access_token from another DFSP:
            | dfsp  | token  | source | proxy | statusCode |
            | alice | bob    |        |       | 400        |
            | alice | bob    | alice  |       | 400        |
            | alice | bob    | alice  | bob   | 400        |
            | alice | bob    | bob    |       | 400        |
            | alice | bob    | bob    | alice | 400        |
        Then requests fail with 400 Bad Request error
        # todo: think if it's better to have 403 Forbidden error

    Scenario: Quotes requests fail validation due to incorrect source/proxy headers
        When send quotes requests with valid access_token and incorrect headers:
            | dfsp  | token  | source | proxy | statusCode |
            | alice | alice  |        |       | 400        |
            | alice | alice  |        | alice | 400        |
            | alice | alice  | alice  | alice | 400        |
            | alice | alice  | alice  | bob   | 400        |
            | alice | alice  | bob    |       | 400        |
        Then requests fail with Bad Request error

    # todo: add scenario for ml-api-adapter
