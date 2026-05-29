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


settings = Settings()
