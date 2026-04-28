ARG ADMIN_IMAGENAME=admin:a148d8f1eba915b8762c5a11596147244dccd73a

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

