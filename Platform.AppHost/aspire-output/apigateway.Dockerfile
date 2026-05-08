ARG ADMIN_IMAGENAME=admin:596f6894bb14fd57fb43fcb2f45070caef26bf6a

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

