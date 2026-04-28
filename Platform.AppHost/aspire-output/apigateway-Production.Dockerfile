ARG ADMIN_IMAGENAME=admin:0cbe8a1601c041cbcf2e40ffb8fc8eaf676c6501

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

