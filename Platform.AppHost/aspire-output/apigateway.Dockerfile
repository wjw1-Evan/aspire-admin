ARG ADMIN_IMAGENAME=admin:97147905ad0c657d075416a92dff195053f4978b

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

