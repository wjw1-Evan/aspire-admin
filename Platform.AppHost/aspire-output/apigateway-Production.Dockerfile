ARG ADMIN_IMAGENAME=admin:66dcf468f45193575985921d6d96e90cd0f8ed60

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

