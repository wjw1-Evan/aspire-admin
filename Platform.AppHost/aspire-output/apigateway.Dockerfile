ARG ADMIN_IMAGENAME=admin:8eec124ac59f6b080e2ee8f8fbb11ab73536d47b

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

