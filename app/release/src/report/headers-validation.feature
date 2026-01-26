@headers @validation
Feature: Validate FSPIOP-Source and FSPIOP-Proxy headers against X-Client-Id

    Background:
        Given credentials for OIDC (Keycloak clients) for DFSPs
            | dfsp      | flow |
            | alice     | oidc |
            | bob       | oidc |

        And hub external API and OIDC endpoints are configured
#       And mTLS creds to connect to extapi endpoint:

        When DFSPs send auth requests to OIDC endpoint with provided credentials

        Then all DFSPs get access tokens


    Scenario: Successful validation of FSPIOP source and proxy headers
        When DFSP sends discovery requests with proper access_token and headers:
            | dfsp  | token   | source | proxy | statusCode |
            | alice | alice   | alice  |       | 202        |
            | alice | alice   | bob    | alice | 202        |
            | alice | alice   | xxx    | alice | 202        |
        Then all requests succeed with proper statusCode


#    Scenario: Failed validation due to incorrect FSPIOP source and proxy headers
#        When DFSP sends discovery requests with valid own access_token and incorrect headers:
#            | dfsp  | token   | source | proxy | statusCode |
#            | alice | alice   | -      | -     | 400        |
#            | alice | alice   | -      | alice | 400        |
#            | alice | alice   | -      | bob   | 400        |
#            | alice | alice   | alice  | alice | 400 (?)    |
#            | alice | alice   | alice  | bob   | 400        |
#            | alice | alice   | bob    | -     | 400        |
#            | alice | alice   | xxx    | -     | 400        |
#            | alice | alice   | alice  | xxx   | 400        |
#            | alice | alice   | bob    | xxx   | 400        |
#        Then all requests fail with proper error statusCode (400)
#
#
#    Scenario: Failed validation due to wrong or missing access token
#        When DFSP send discovery (GET /parties/...) request without access token with following headers:
#            | dfsp  | token   | source | proxy | statusCode |
#            | alice | -       | -      | -     | 403        |
#            | alice | -       | alice  | -     | 403        |
#            | alice | -       | bob    | alice | 403        |
#        Then all requests fail with 403 error
#
#        When send discovery requests with access_token from another DFSP:
#            | dfsp  | token  | source | proxy | statusCode |
#            | alice | bob    | -      | -     | 403        |
#            | alice | bob    | alice  | -     | 403        |
#            | alice | bob    | alice  | bob   | 403        |
#            | alice | bob    | bob    | -     | 403        |
#            | alice | bob    | bob    | alice | 403        |
#        Then requests fail with proper error statusCode (403)
