FROM node:22-bookworm-slim AS web-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts ./
COPY demo ./demo
COPY privacy ./privacy
COPY terms ./terms
COPY public ./public
COPY src ./src
RUN npm run build

FROM rust:1-slim AS server-build
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src/lib.rs ./src/lib.rs
COPY src/bin/rankless-rally-server.rs ./src/bin/rankless-rally-server.rs
ARG BUILD_SHA=dev
ENV BUILD_SHA=$BUILD_SHA
RUN cargo build --release --bin rankless-rally-server

FROM debian:bookworm-slim
ARG BUILD_SHA=dev
ENV BUILD_SHA=$BUILD_SHA
WORKDIR /app
RUN useradd --system --uid 10001 --create-home rankless
COPY --from=server-build /app/target/release/rankless-rally-server /app/rankless-rally-server
COPY --from=web-build /app/dist /app/dist
RUN mkdir -p /data && chown -R rankless:rankless /app /data
USER rankless
EXPOSE 8080
ENTRYPOINT ["/app/rankless-rally-server"]
