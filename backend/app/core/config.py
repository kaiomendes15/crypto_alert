from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    rabbitmq_url: str = ""
    resend_api_key: str = ""
    resend_from_email: str = ""
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    poll_interval_seconds: int = 120
    coingecko_base_url: str = "https://api.coingecko.com/api/v3"
    alert_queue_name: str = "alerts"

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_min_length(cls, v: str) -> str:
        if len(v.encode()) < 32:
            raise ValueError("JWT_SECRET must be at least 32 bytes for HS256")
        return v


settings = Settings()
