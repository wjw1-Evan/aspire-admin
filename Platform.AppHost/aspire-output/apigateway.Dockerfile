ARG ADMIN_IMAGENAME=admin:044dae5c0e68ab7d6a27ecc0c27a363c6509ab86

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

