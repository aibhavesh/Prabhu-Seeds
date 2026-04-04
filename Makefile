.PHONY: dev test lint format migrate docker-up docker-down

dev:
	uvicorn app.main:app --reload --port 8000

test:
	pytest --cov=app -v

lint:
	ruff check app/ tests/
	mypy app/

format:
	ruff format app/ tests/

migrate:
	alembic upgrade head

migrate-new:
	alembic revision --autogenerate -m "$(msg)"

migrate-down:
	alembic downgrade -1

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements-dev.txt
