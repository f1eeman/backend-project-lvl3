install: install-deps

install-deps:
	npm ci

build:
	npm run build

test:
	npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8

lint:
	npx eslint .

.PHONY: test