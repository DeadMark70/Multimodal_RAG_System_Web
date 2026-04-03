FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json /app/
RUN npm ci

COPY . /app

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_BASE_URL=/
ARG VITE_TEST_MODE=false
ARG VITE_MOCK_MODE=false

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_TEST_MODE=$VITE_TEST_MODE \
    VITE_MOCK_MODE=$VITE_MOCK_MODE

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
