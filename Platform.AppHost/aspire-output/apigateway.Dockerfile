ARG ADMIN_IMAGENAME=admin:fb3771a2e10798a565f92ef12b5646849f0a044c

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

