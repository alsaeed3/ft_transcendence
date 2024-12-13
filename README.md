The project consists of 3 parts - backend(service for "user management"), service2(service for "tournament management") and frontend(react frontend).
There are 5 contaners - in addition to the containers with services mentioned abouve, there are two more containers with databases for both backend services

To run whole project clone repo and follow these steps:

	1. In bash type "docker compose up --build"
	2. In another bash tab type "docker exec -it drf2-web-1 bash" to reach the container with first service.
	3. In that tab type "python manage.py runserver_plus 0.0.0.0:8000 --cert-file /app/certificates/server.crt --key-file /app/certificates/server.key" to run first backend server
	4. To run another backend server open another new tab and type "docker exec -it drf2-tournaments-1 bash"
	5. Then "python manage.py runserver_plus 0.0.0.0:8002 --cert-file /app/certificates/server.crt --key-file /app/certificates/server.key"
	6. To run frontend in new bash tab type "docker exec -it drf2-frontend-1 bash" then
	7. Type "npm run dev"

To move through the app use https:/localhost:3000/....


UPD. I added another 1docker-compose.yml file. Now you can run whole working project with only one command (docker compose up --build).
To do that you just have to rename both files. docker-compose.yml -> to any other name. 1docker-compose.yml -> to docker-compose.yml.
Then just docker 'compose up --build' and you can test the project in browser
