ARG ADMIN_IMAGENAME=admin:bd1214eeab7fa3751cc97232b7ee7b061526ca69

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

