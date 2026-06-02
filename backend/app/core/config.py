from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    backend_cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,https://crypto-alert-frontend.onrender.com"
    backend_cors_origin_regex: str | None = None
    rabbitmq_url: str = ""
    resend_api_key: str = ""
    resend_from_email: str = ""
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    poll_interval_seconds: int = 120
    coingecko_base_url: str = "https://api.coingecko.com/api/v3"

    @field_validator("database_url")
    @classmethod
    def database_url_uses_asyncpg(cls, v: str) -> str:
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @property
    def cors_origins(self) -> list[str]:
        origins = []
        for origin in self.backend_cors_origins.split(","):
            origin = origin.strip().rstrip("/")
            if not origin:
                continue
            if "://" not in origin:
                origin = f"https://{origin}"
            origins.append(origin)
        return origins

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_min_length(cls, v: str) -> str:
        if len(v.encode()) < 32:
            raise ValueError("JWT_SECRET must be at least 32 bytes for HS256")
        return v


settings = Settings()
