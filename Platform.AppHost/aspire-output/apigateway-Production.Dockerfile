ARG ADMIN_IMAGENAME=admin:ac4c5e6383f0aa8563b407f534706c0afcc70911

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

