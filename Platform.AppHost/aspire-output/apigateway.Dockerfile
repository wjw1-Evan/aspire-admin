ARG ADMIN_IMAGENAME=admin:47bfb42b82c2ce2010c2bda0ef20b14f63f7d086

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

