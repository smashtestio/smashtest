up: ## Spin up the container
	docker-compose -p SmashTest up -d

stop: ## Stop running containers
	docker-compose -P SmashTest stop

kill: ## Stop and remove all containers
	docker-compose -P SmashTest down

build: ## Rebuild the image
	docker image build -t smashtestio .

