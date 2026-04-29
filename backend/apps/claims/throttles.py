from rest_framework.throttling import UserRateThrottle

class ClaimCreateThrottle(UserRateThrottle):
    scope = 'claim_create'
    rate = '10/hour'
