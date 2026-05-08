ARG ADMIN_IMAGENAME=admin:db320c882dd54e1be6d775cef72e77a51974f784

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

