ARG ADMIN_IMAGENAME=admin:e36faf04bbba23cfd2aafc2c443c5921aefa3925

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

