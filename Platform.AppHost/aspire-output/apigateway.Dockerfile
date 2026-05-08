ARG ADMIN_IMAGENAME=admin:07eb89db81a8555460a436e2cd66438e7f5e5437

FROM ${ADMIN_IMAGENAME} AS admin_stage

FROM mcr.microsoft.com/dotnet/nightly/yarp:2.3-preview
WORKDIR /app
COPY --from=admin_stage /app/dist /app/wwwroot

