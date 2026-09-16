docker buildx build -f Frontend/Dockerfile.dev -t ghcr.io/schreinereiwiest/carpentersproduction/frontend:latest Frontend

docker buildx build   -f Backend/Dockerfile.dev   -t ghcr.io/schreinereiwiest/carpentersproduction/backend:latest Backend

docker push ghcr.io/schreinereiwiest/carpentersproduction/backend:latest

docker push ghcr.io/schreinereiwiest/carpentersproduction/frontend:latest