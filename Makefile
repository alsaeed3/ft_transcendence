all:
	@docker-compose -f docker-compose.yml up -d --build

down:
	@docker-compose -f docker-compose.yml down

stop:
	@docker-compose -f docker-compose.yml stop

re: clean
	@docker-compose -f docker-compose.yml up -d --build

clean:
	@if docker ps -qa | grep -q .; then \
		docker stop $$(docker ps -qa); \
		docker rm $$(docker ps -qa); \
	fi
	@if docker volume ls -q | grep -q .; then \
		docker volume rm $$(docker volume ls -q); \
	fi
	@if docker images -qa | grep -q .; then \
		docker rmi -f $$(docker images -qa); \
	fi
	@if docker network ls --format '{{.Name}}' | grep -v 'bridge\|host\|none' | grep -q .; then \
		docker network rm $$(docker network ls --format '{{.Name}}' | grep -v 'bridge\|host\|none'); \
	fi

.PHONY: all re down clean