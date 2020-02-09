up: ## Spin up the container
	docker-compose -p SmashTest up -d

stop: ## Stop running containers
	docker-compose -P SmashTest stop

kill: ## Stop and remove all containers
	docker-compose -P SmashTest down

build: ## Rebuild the image
	docker image build -t smashtestio .

shell: ## Start the container with a command prompt
	docker-compose -P SmashTest run bash

devel: ## Start up a new container from the image and open a shell
	docker run --entrypoint bash -it smashtestio

