"""RabbitMQ topology — single source of truth shared by the publisher (API) and the
worker (consumer). Keeping these as code constants (not env vars) guarantees the
publisher and the independently-deployed worker can never drift onto different
exchanges/queues, which would silently break email delivery.

Matches docs/M6: direct exchange `alerts_exchange`, durable queue
`price_alerts_queue`, routing key `alert.triggered`.
"""

EXCHANGE_NAME = "alerts_exchange"
QUEUE_NAME = "price_alerts_queue"
ROUTING_KEY = "alert.triggered"
