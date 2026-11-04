.PHONY: backend-dev backend-check backend-test backend-lint

backend-dev:
	bash scripts/backend_dev.sh

backend-check:
	bash scripts/backend_check.sh

backend-test:
	cd backend && pytest tests -q

backend-lint:
	cd backend && ruff check app tests
