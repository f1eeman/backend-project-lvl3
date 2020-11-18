install: install-deps

install-deps:
	npm ci

build:
	npm run build

test:
	DEBUG=nock.scope* npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8

lint:
	npx eslint .

.PHONY: test