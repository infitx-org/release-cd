Feature: Portal RBAC API Access

    Background:
        Given the following roles exist:
            | role      |
            | anonymous |
            | mcm_admin |
        And the login URL is configured
        And the portals URLs are configured
        And the following API endpoints are available:
            | portal | endpoint              | path                             | method |
            | MCM    | DFSP List             | /api/dfsps                       | GET    |
            | MCM    | Unprocessed Endpoints | /api/dfsps/endpoints/unprocessed | GET    |
            | MCM    | Hub CA                | /api/hub/ca                      | GET    |
            | MCM    | Hub Egress IPs        | /api/hub/endpoints/egress/ips    | GET    |
            | MCM    | Hub Ingress IPs       | /api/hub/endpoints/ingress/ips   | GET    |
            | MCM    | Hub Ingress URLs      | /api/hub/endpoints/ingress/urls  | GET    |
            | MCM    | Hub Monetary Zones    | /api/monetaryzones               | GET    |

    Scenario Outline: "<role>" access to MCM endpoint "<endpoint_name>"
        Given I am authenticated as "<role>" at portal "MCM"
        When I send a request to "<endpoint_name>"
        Then I should receive a "<expected_status>" response for "<endpoint_name>"
        Examples:
            | role      | endpoint_name         | expected_status |
            # anonymous tests
            | anonymous | DFSP List             | 401             |
            | anonymous | Unprocessed Endpoints | 401             |
            | anonymous | Hub CA                | 401             |
            | anonymous | Hub Egress IPs        | 401             |
            | anonymous | Hub Ingress IPs       | 401             |
            | anonymous | Hub Ingress URLs      | 401             |
            | anonymous | Hub Monetary Zones    | 401             |
            # mcm_admin tests
            | mcm_admin | DFSP List             | 200             |
            | mcm_admin | Unprocessed Endpoints | 200             |
            | mcm_admin | Hub CA                | 200             |
            | mcm_admin | Hub Egress IPs        | 200             |
            | mcm_admin | Hub Ingress IPs       | 200             |
            | mcm_admin | Hub Ingress URLs      | 200             |
            | mcm_admin | Hub Monetary Zones    | 200             |
