ARG ADMIN_IMAGENAME=admin:6b149bc687bd4bc9c0bbfee33a610eb8444c4d9c

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

