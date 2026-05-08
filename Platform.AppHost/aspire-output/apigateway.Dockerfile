ARG ADMIN_IMAGENAME=admin:1009e87e8c5195434db8cde702272e7ac5fbe55b

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

