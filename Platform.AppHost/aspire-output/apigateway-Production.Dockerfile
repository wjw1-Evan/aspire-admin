ARG ADMIN_IMAGENAME=admin:bd0c1cab9e5952692ec632b14bf58eb07e7c7236

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

