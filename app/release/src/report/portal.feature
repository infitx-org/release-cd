@rbac @oidc @form
Feature: Portal RBAC API Access

    Background:
        Given credentials for the following roles are configured:
            | role      | portal   | flow |
            | anonymous | MCM      | form |
            | mcm_admin | MCM      | form |
            | alice     | MCM-ext  | oidc |
            | bob       | MCM-ext  | oidc |
        And portal and login URLs for the following portals are configured:
            | portal  |
            | MCM     |
            | MCM-ext |
        And I am authenticated with the existing roles

    Scenario: MCM DFSP endpoints
        Then check access for the following endpoints:
            | portal | path                                                     | method | anonymous | mcm_admin |
            | MCM    | /dfsps/test-rbac/endpoints                               | GET    |       401 |       200 |
            | MCM    | /dfsps/test-rbac/endpoints/x                             | GET    |       401 |       404 |
            | MCM    | /dfsps/test-rbac/endpoints/x                             | PUT    |       401 |       415 |
            | MCM    | /dfsps/test-rbac/endpoints/x                             | DELETE |       401 |       404 |
            | MCM    | /dfsps/test-rbac/endpoints/x/confirmation                | POST   |       401 |       400 |
            | MCM    | /dfsps/test-rbac/endpoints/egress                        | GET    |       401 |       404 |
            | MCM    | /dfsps/test-rbac/endpoints/egress                        | POST   |       401 |       415 |
            | MCM    | /dfsps/test-rbac/endpoints/egress/ips                    | GET    |       401 |       200 |
            | MCM    | /dfsps/test-rbac/endpoints/egress/ips                    | POST   |       401 |       415 |
            | MCM    | /dfsps/test-rbac/endpoints/egress/ips/0                  | GET    |       401 |       404 |
            | MCM    | /dfsps/test-rbac/endpoints/egress/ips/0                  | PUT    |       401 |       415 |
            | MCM    | /dfsps/test-rbac/endpoints/egress/ips/0                  | DELETE |       401 |       404 |
            | MCM    | /dfsps/test-rbac/endpoints/ingress                       | GET    |       401 |       404 |
            | MCM    | /dfsps/test-rbac/endpoints/ingress                       | POST   |       401 |       415 |
            | MCM    | /dfsps/test-rbac/endpoints/ingress/ips                   | GET    |       401 |       200 |
            | MCM    | /dfsps/test-rbac/endpoints/ingress/ips                   | POST   |       401 |       415 |
            | MCM    | /dfsps/test-rbac/endpoints/ingress/ips/0                 | GET    |       401 |       404 |
            | MCM    | /dfsps/test-rbac/endpoints/ingress/ips/0                 | PUT    |       401 |       415 |
            | MCM    | /dfsps/test-rbac/endpoints/ingress/ips/0                 | DELETE |       401 |       404 |
            | MCM    | /dfsps/test-rbac/endpoints/ingress/urls                  | GET    |       401 |       200 |
            | MCM    | /dfsps/test-rbac/endpoints/ingress/urls                  | POST   |       401 |       415 |
            | MCM    | /dfsps/test-rbac/endpoints/ingress/urls/0                | GET    |       401 |       404 |
            | MCM    | /dfsps/test-rbac/endpoints/ingress/urls/0                | PUT    |       401 |       415 |
            | MCM    | /dfsps/test-rbac/endpoints/ingress/urls/0                | DELETE |       401 |       404 |
            | MCM    | /dfsps/test-rbac/endpoints/unprocessed                   | GET    |       401 |       200 |

    Scenario: MCM DFSPs
        Then check access for the following endpoints:
            | portal | path                                                     | method | anonymous | mcm_admin |
            | MCM    | /dfsps/test-rbac                                         | PUT    |       404 |       404 |
            | MCM    | /dfsps/test-rbac/ca                                      | GET    |       401 |       200 |
            | MCM    | /dfsps/test-rbac/ca                                      | POST   |       401 |       415 |
            | MCM    | /dfsps/test-rbac/enrollments/inbound                     | GET    |       401 |       200 |
            | MCM    | /dfsps/test-rbac/enrollments/inbound                     | POST   |       401 |       415 |
            | MCM    | /dfsps/test-rbac/enrollments/inbound/0                   | GET    |       401 |       404 |
            | MCM    | /dfsps/test-rbac/enrollments/inbound/0/sign              | POST   |       401 |       404 |
            | MCM    | /dfsps/test-rbac/enrollments/outbound                    | GET    |       401 |       200 |
            | MCM    | /dfsps/test-rbac/enrollments/outbound/0                  | GET    |       401 |       404 |
            | MCM    | /dfsps/test-rbac/enrollments/outbound/0/certificate      | POST   |       401 |       415 |
            | MCM    | /dfsps/test-rbac/enrollments/outbound/0/validate         | POST   |       401 |       404 |
            | MCM    | /dfsps/test-rbac/enrollments/outbound/csr                | POST   |       401 |       200 |
            | MCM    | /dfsps/test-rbac/jwscerts                                | GET    |       401 |       404 |
            | MCM    | /dfsps/test-rbac/jwscerts                                | POST   |       401 |       415 |
            | MCM    | /dfsps/test-rbac/jwscerts                                | DELETE |       401 |       200 |
            | MCM    | /dfsps/test-rbac/onboard                                 | POST   |       401 |       404 |
            | MCM    | /dfsps/test-rbac/servercerts                             | GET    |       401 |       404 |
            | MCM    | /dfsps/test-rbac/servercerts                             | PUT    |       401 |       415 |
            | MCM    | /dfsps/test-rbac/servercerts                             | POST   |       401 |       415 |
            | MCM    | /dfsps/test-rbac/servercerts                             | DELETE |       401 |       200 |
            | MCM    | /dfsps/test-rbac/states                                  | POST   |       401 |       415 |
            | MCM    | /dfsps/test-rbac/status                                  | GET    |       401 |       200 |

    Scenario: MCM HUB endpoints
        Then check access for the following endpoints:
            | portal | path                                                    | method | anonymous | mcm_admin |
            | MCM    | /hub/endpoints                                          | GET    |       401 |       200 |
            | MCM    | /hub/endpoints/0                                        | GET    |       401 |       404 |
            | MCM    | /hub/endpoints/0                                        | PUT    |       401 |       415 |
            | MCM    | /hub/endpoints/0                                        | DELETE |       401 |       404 |
            | MCM    | /hub/endpoints/egress/ips                               | GET    |       401 |       200 |
            | MCM    | /hub/endpoints/egress/ips                               | POST   |       401 |       415 |
            | MCM    | /hub/endpoints/egress/ips/0                             | GET    |       401 |       404 |
            | MCM    | /hub/endpoints/egress/ips/0                             | PUT    |       401 |       415 |
            | MCM    | /hub/endpoints/egress/ips/0                             | DELETE |       401 |       404 |
            | MCM    | /hub/endpoints/ingress/ips                              | GET    |       401 |       200 |
            | MCM    | /hub/endpoints/ingress/ips                              | POST   |       401 |       415 |
            | MCM    | /hub/endpoints/ingress/ips/0                            | GET    |       401 |       404 |
            | MCM    | /hub/endpoints/ingress/ips/0                            | PUT    |       401 |       415 |
            | MCM    | /hub/endpoints/ingress/ips/0                            | DELETE |       401 |       404 |
            | MCM    | /hub/endpoints/ingress/urls                             | GET    |       401 |       200 |
            | MCM    | /hub/endpoints/ingress/urls                             | POST   |       401 |       415 |
            | MCM    | /hub/endpoints/ingress/urls/0                           | GET    |       401 |       404 |
            | MCM    | /hub/endpoints/ingress/urls/0                           | PUT    |       401 |       415 |
            | MCM    | /hub/endpoints/ingress/urls/0                           | DELETE |       401 |       404 |

    Scenario: MCM Other endpoints
        Then check access for the following endpoints:
            | portal | path                                                    | method | anonymous | mcm_admin |
            | MCM    | /dfsps                                                  | GET    |       401 |       200 |
            | MCM    | /dfsps                                                  | POST   |       401 |       415 |
            | MCM    | /dfsps/endpoints/unprocessed                            | GET    |       401 |       200 |
            | MCM    | /dfsps/jwscerts                                         | GET    |       401 |       200 |
            | MCM    | /dfsps/servercerts                                      | GET    |       401 |       200 |
            | MCM    | /dfsps/states-status                                    | GET    |       401 |       200 |
            | MCM    | /external-dfsps/jwscerts                                | POST   |       404 |       404 |
            | MCM    | /hub/ca                                                 | GET    |       401 |       200 |
            | MCM    | /hub/ca                                                 | POST   |       401 |       415 |
            | MCM    | /hub/ca                                                 | PUT    |       401 |       415 |
            | MCM    | /hub/jwscerts                                           | GET    |       401 |       200 |
            | MCM    | /hub/jwscerts                                           | POST   |       401 |       415 |
            | MCM    | /hub/servercerts                                        | GET    |       401 |       404 |
            | MCM    | /monetaryzones                                          | GET    |       401 |       200 |
            | MCM    | /monetaryzones/XXX/dfsps?monetaryZoneId=XXX             | GET    |       404 |       404 |
            | MCM    | /resetPassword                                          | POST   |       404 |       404 |
          # unsafe to test
          # | MCM    | /hub/ca                                                 | DELETE |       401 |       200 |
          # | MCM    | /hub/servercerts                                        | POST   |       401 |       200 |
          # | MCM    | /hub/servercerts                                        | DELETE |       401 |       200 |
          # | MCM    | /login                                                  | POST   |       401 |       200 |
          # | MCM    | /logout                                                 | POST   |       401 |       200 |

    Scenario: MCM-ext DFSP endpoints
        Then check access for the following endpoints:
            | portal  | path                                                     | method | bob | alice |
            | MCM-ext | /dfsps/test-alice/enrollments/outbound                   | GET    | 403 |   200 |
            | MCM-ext | /dfsps/test-bob/enrollments/outbound                     | GET    | 200 |   403 |
