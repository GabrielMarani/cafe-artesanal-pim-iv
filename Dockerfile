# ---------------------------------------------------------------------
# Café Artesanal — imagem da API + front-end web (multi-stage)
# ---------------------------------------------------------------------

# 1) Build: restaura, compila, roda os testes e publica
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY CafeArtesanal.sln ./
COPY src/CafeArtesanal.Domain/CafeArtesanal.Domain.csproj src/CafeArtesanal.Domain/
COPY src/CafeArtesanal.Application/CafeArtesanal.Application.csproj src/CafeArtesanal.Application/
COPY src/CafeArtesanal.Infrastructure/CafeArtesanal.Infrastructure.csproj src/CafeArtesanal.Infrastructure/
COPY src/CafeArtesanal.Api/CafeArtesanal.Api.csproj src/CafeArtesanal.Api/
COPY tests/CafeArtesanal.Tests/CafeArtesanal.Tests.csproj tests/CafeArtesanal.Tests/
RUN dotnet restore CafeArtesanal.sln

COPY database/ database/
COPY src/ src/
COPY tests/ tests/
RUN dotnet test tests/CafeArtesanal.Tests -c Release --no-restore \
 && dotnet publish src/CafeArtesanal.Api -c Release --no-restore -o /app/publish /p:UseAppHost=false

# 2) Runtime: imagem enxuta, usuário sem privilégios de root
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    TZ=America/Sao_Paulo
COPY --from=build /app/publish .
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "CafeArtesanal.Api.dll"]
