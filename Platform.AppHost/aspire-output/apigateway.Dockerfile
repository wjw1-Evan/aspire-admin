ARG ADMIN_IMAGENAME=admin:a61507b92048b653077376d688fb1d3776e8b2f2

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

